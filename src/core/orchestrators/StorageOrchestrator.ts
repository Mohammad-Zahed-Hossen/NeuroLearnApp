/**
 * StorageOrchestrator - Unified Storage Management
 *
 * Manages the three-tier storage architecture (MMKV -> WatermelonDB -> Supabase)
 * with intelligent data flow, automatic synchronization, and conflict resolution.
 *
 * Storage Tiers:
 * - Hot (MMKV): Ultra-fast cache for active data (< 10MB)
 * - Warm (WatermelonDB): Local structured storage (0-48h data)
 * - Cold (Supabase): Cloud persistence and multi-device sync
 */

import { EventSystem, NeuroLearnEvent } from '../EventSystem';
import { DataFlowManager } from '../DataFlowManager';
import { Logger } from '../utils/Logger';
import { getErrorMessage } from '../utils/ErrorHandler';
import { CommandContext, CommandResult } from '../NeuroLearnEngine';

// Storage Services
import HybridStorageService from '../../services/storage/HybridStorageService';
import MMKVStorageService from '../../services/storage/MMKVStorageService';
import { SupabaseStorageService } from '../../services/storage/SupabaseStorageService';
// Compatibility shims to bridge legacy APIs
import MMKVStorageCompat from '../../services/storage/MMKVStorageCompat';
import HybridStorageCompat from '../../services/storage/HybridStorageCompat';
import SupabaseStorageCompat from '../../services/storage/SupabaseStorageCompat';

export interface StorageConfig {
  hotStorageMaxSize: number; // MB
  warmStorageRetentionHours: number;
  autoSyncInterval: number; // minutes
  compressionThreshold: number; // bytes
  maxRetryAttempts: number;
}

export interface StorageMetrics {
  hotStorageUsage: number;
  warmStorageUsage: number;
  coldStorageUsage: number;
  syncOperations: number;
  failedOperations: number;
  lastSyncTime: Date | null;
  cacheHitRate: number;
}

// Minimal interface describing methods the orchestrator expects from storage services.
// Methods are optional to allow compatibility shims and gradual tightening.
interface IStorageService {
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
  optimizeStorage(): Promise<void>;
  saveSessionProgress(data: any): Promise<void>;
  saveUserProgress(data: any): Promise<void>;
  setItem(key: string, value: any): Promise<void>;
  getItem(key: string): Promise<any>;
  removeItem(key: string): Promise<void>;
  query(collection: string, filters?: any): Promise<any>;
  syncToCloud(): Promise<void>;
  getStorageSize(): Promise<number>;
  clearNonEssential(): Promise<void>;
  getAllKeys(): Promise<string[]>;
  // allow extension for compat shims
  [key: string]: any;
}

/**
 * Storage Orchestrator
 *
 * Central coordinator for all storage operations across the three-tier architecture.
 */
export class StorageOrchestrator {
  private eventSystem: EventSystem;
  private dataFlowManager: DataFlowManager;
  private logger: Logger;

  // Storage services typed by the minimal interface for progressive tightening
  private hybridStorage!: IStorageService;
  private mmkvStorage!: IStorageService;
  private supabaseStorage!: IStorageService;

  // Configuration
  private config: StorageConfig = {
    hotStorageMaxSize: 10, // MB
    warmStorageRetentionHours: 48,
    autoSyncInterval: 15, // minutes
    compressionThreshold: 1024 * 100, // 100KB
    maxRetryAttempts: 3
  };

  // State
  private isInitialized = false;
  private syncTimer: NodeJS.Timeout | null = null;
  private metrics: StorageMetrics = {
    hotStorageUsage: 0,
    warmStorageUsage: 0,
    coldStorageUsage: 0,
    syncOperations: 0,
    failedOperations: 0,
    lastSyncTime: null,
    cacheHitRate: 0
  };

  // Performance tracking
  private cacheHits = 0;
  private cacheMisses = 0;
  private operationQueue: Array<() => Promise<void>> = [];
  private isProcessingQueue = false;
  // Pending debounced writes to avoid write storms
  private pendingWrites: Map<string, { timer: NodeJS.Timeout; value: any; storage: any }> = new Map();
  // Track keys we've warned about missing setItem to avoid spam
  private missingSetItemWarned: Set<string> = new Set();
  // Debounce interval for coalescing rapid setItem calls (ms)
  private writeDebounceMs = 250;

  constructor(
    eventSystem: EventSystem,
    dataFlowManager: DataFlowManager,
    logger: Logger,
    config?: Partial<StorageConfig>
  ) {
    this.eventSystem = eventSystem;
    this.dataFlowManager = dataFlowManager;
    this.logger = logger;

    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  /**
   * Initialize the storage orchestrator
   */
  public async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing Storage Orchestrator...');

      // Initialize storage services
      // Prefer canonical services; compat shims remain supported but we prefer typed canonical instances
      this.hybridStorage = (HybridStorageCompat as any)?.getInstance ? (HybridStorageCompat as any).getInstance() : HybridStorageService.getInstance();
      // MMKV may export instance or class; try compat then class instance
      if ((MMKVStorageCompat as any)?.getInstance) {
        this.mmkvStorage = (MMKVStorageCompat as any).getInstance();
      } else if ((MMKVStorageService as any)?.getInstance) {
        this.mmkvStorage = (MMKVStorageService as any).getInstance();
      } else {
        this.mmkvStorage = MMKVStorageService as any;
      }
      this.supabaseStorage = (SupabaseStorageCompat as any) || ((SupabaseStorageService as any)?.getInstance ? (SupabaseStorageService as any).getInstance() : (SupabaseStorageService as any));

      // Initialize services
      await Promise.all([
        (this.hybridStorage.initialize && this.hybridStorage.initialize()) || Promise.resolve(),
        (this.mmkvStorage.initialize && this.mmkvStorage.initialize()) || Promise.resolve(),
        (this.supabaseStorage.initialize && this.supabaseStorage.initialize()) || Promise.resolve()
      ]);

      // Setup event listeners
      this.setupEventListeners();

      // Start background processes
      this.startBackgroundProcesses();

      // Initial metrics calculation
      await this.calculateMetrics();

      this.isInitialized = true;
      this.logger.info('Storage Orchestrator initialized successfully');

      this.eventSystem.emitEvent(
        'storage:orchestrator:initialized',
        'StorageOrchestrator',
        { metrics: this.metrics },
        'medium'
      );

    } catch (error) {
      this.logger.error('Failed to initialize Storage Orchestrator', error);
      throw error;
    }
  }

  // Backwards-compat: some code calls reinitialize(); forward to initialize()
  public async reinitialize(): Promise<void> {
    return this.initialize();
  }

  /**
   * Execute storage commands
   */
  public async execute(
    action: string,
    params: any,
    context: CommandContext
  ): Promise<CommandResult> {
    if (!this.isInitialized) {
      throw new Error('StorageOrchestrator not initialized');
    }

    try {
      switch (action) {
        case 'get':
          return await this.handleGet(params, context);

        case 'set':
          return await this.handleSet(params, context);

        case 'delete':
          return await this.handleDelete(params, context);

        case 'query':
          return await this.handleQuery(params, context);

        case 'sync':
          return await this.handleSync(params, context);

        case 'migrate':
          return await this.handleMigrate(params, context);

        case 'clear-cache':
          return await this.handleClearCache(params, context);

        case 'optimize':
          return await this.handleOptimize(params, context);

        case 'metrics':
          await this.calculateMetrics();
          return { success: true, data: this.metrics };

        default:
          throw new Error(`Unknown storage action: ${action}`);
      }
    } catch (error) {
      this.metrics.failedOperations++;
      this.logger.error(`Storage operation failed: ${action}`, error);
      return { success: false, error: getErrorMessage(error) };
    }
  }

  /**
   * Force synchronization across all storage tiers
   */
  public async sync(): Promise<void> {
    this.logger.info('Starting forced synchronization...');

    try {
      this.metrics.syncOperations++;

      // Sync hot to warm
      await this.syncHotToWarm();

      // Sync warm to cold
      await this.syncWarmToCold();

      // Update metrics
      this.metrics.lastSyncTime = new Date();

      this.eventSystem.emitEvent(
        'storage:sync:completed',
        'StorageOrchestrator',
        { timestamp: this.metrics.lastSyncTime },
        'medium'
      );

      this.logger.info('Forced synchronization completed');

    } catch (error) {
      this.metrics.failedOperations++;
      this.logger.error('Forced synchronization failed', error);

      this.eventSystem.emitEvent(
        'storage:sync:failed',
        'StorageOrchestrator',
        { error: getErrorMessage(error) },
        'high'
      );

      throw error;
    }
  }

  /**
   * Clear all caches and optimize storage
   */
  public async clearCaches(): Promise<void> {
    this.logger.info('Clearing all caches...');

    try {
  // Clear hot storage (but keep essential data)
  await this.mmkvStorage.clearNonEssential();

  // Optimize warm storage (best-effort)
  await this.hybridStorage.optimizeStorage();

      // Reset cache metrics
      this.cacheHits = 0;
      this.cacheMisses = 0;

      await this.calculateMetrics();

      this.logger.info('Cache clearing completed');

    } catch (error) {
      this.logger.error('Cache clearing failed', error);
      throw error;
    }
  }

  /**
   * Save session progress immediately to all tiers
   */
  public async saveSessionProgress(): Promise<void> {
    this.logger.info('Saving session progress...');

    try {
      // Get current session data from various sources
      const sessionData = await this.gatherSessionData();

      // Save to hot storage immediately (best-effort)
      await this.mmkvStorage.setItem('current_session', sessionData);

      // Queue for warm storage (best-effort)
      await this.hybridStorage.saveSessionProgress(sessionData);

      // Queue for cold storage (async)
      this.queueOperation(async () => {
        await this.supabaseStorage.saveSessionProgress(sessionData);
      });

      this.logger.info('Session progress saved');

    } catch (error) {
      this.logger.error('Failed to save session progress', error);
      throw error;
    }
  }

  /**
   * Get current storage status
   */
  public getStatus(): 'active' | 'idle' | 'error' | 'disabled' {
    if (!this.isInitialized) return 'disabled';
    if (this.metrics.failedOperations > 10) return 'error';
    if (this.operationQueue.length > 0 || this.isProcessingQueue) return 'active';
    return 'idle';
  }

  /**
   * Get storage metrics
   */
  public getMetrics(): StorageMetrics {
    return { ...this.metrics };
  }

  /**
   * Shutdown the orchestrator
   */
  public async shutdown(): Promise<void> {
    this.logger.info('Shutting down Storage Orchestrator...');

    try {
      // Stop background processes
      if (this.syncTimer) {
        clearInterval(this.syncTimer);
        this.syncTimer = null;
      }

      // Process remaining operations
      await this.processOperationQueue();

      // Flush any pending debounced writes before final sync/shutdown
      await this.flushAllPendingWrites();

      // Final sync
      await this.sync();

      // Shutdown services
      await Promise.all([
        this.hybridStorage.shutdown(),
        this.mmkvStorage.shutdown(),
        this.supabaseStorage.shutdown()
      ]);

      this.isInitialized = false;
      this.logger.info('Storage Orchestrator shutdown completed');

    } catch (error) {
      this.logger.error('Storage Orchestrator shutdown error', error);
    }
  }

  // Private Methods

  private setupEventListeners(): void {
    // Listen for data flow events
    this.eventSystem.subscribe('storage:data:changed', async (event) => {
      await this.handleDataChanged(event);
    });

    // Listen for network events
    this.eventSystem.subscribe('network:online', async () => {
      await this.handleNetworkOnline();
    });

    this.eventSystem.subscribe('network:offline', async () => {
      await this.handleNetworkOffline();
    });

    // Listen for cognitive load events
    this.eventSystem.subscribe('cognitive:load:high', async () => {
      // Reduce background operations when cognitive load is high
      this.reduceBgOperations();
    });
  }

  private startBackgroundProcesses(): void {
    // Auto-sync timer
    this.syncTimer = setInterval(async () => {
      try {
        await this.performBackgroundSync();
      } catch (error) {
        this.logger.warn('Background sync failed', error);
      }
    }, this.config.autoSyncInterval * 60 * 1000);

    // Operation queue processor
    setInterval(() => {
      this.processOperationQueue();
    }, 1000);

    // Metrics calculation
    setInterval(() => {
      this.calculateMetrics();
    }, 30000); // Every 30 seconds
  }

  // Command Handlers

  private async handleGet(params: any, context: CommandContext): Promise<CommandResult> {
    const { key, tier, useCache = true } = params;

    try {
      let data;
      let source = 'unknown';

      if (useCache) {
        // Try hot storage first
        data = await this.mmkvStorage.getItem(key);
        if (data !== null) {
          this.cacheHits++;
          source = 'hot';
        } else {
          this.cacheMisses++;

          // Try warm storage
            data = await this.safeGetItem(this.hybridStorage, key);
            if (data !== null) {
              source = 'warm';

              // Cache in hot storage for future access
              if (this.shouldCacheInHot(data)) {
                await this.mmkvStorage.setItem(key, data);
              }
            } else {
            // Try cold storage
            data = await this.supabaseStorage.getItem(key);
            if (data !== null) {
              source = 'cold';

              // Cache in warm and hot storage
              await this.safeSetItem(this.hybridStorage, key, data);
              if (this.shouldCacheInHot(data)) {
                await this.mmkvStorage.setItem(key, data);
              }
            }
          }
        }
      } else {
        // Direct access to specified tier
        switch (tier) {
          case 'hot':
            data = await this.mmkvStorage.getItem(key);
            source = 'hot';
            break;
          case 'warm':
            data = await this.hybridStorage.getItem(key);
            source = 'warm';
            break;
          case 'cold':
            data = await this.supabaseStorage.getItem(key);
            source = 'cold';
            break;
          default:
            throw new Error(`Invalid storage tier: ${tier}`);
        }
      }

      return {
        success: true,
        data: {
          value: data,
          source,
          cacheHit: source === 'hot'
        }
      };

    } catch (error) {
      return { success: false, error: getErrorMessage(error) };
    }
  }

  private async handleSet(params: any, context: CommandContext): Promise<CommandResult> {
    const { key, value, tier = 'auto', immediate = false } = params;

    try {
      if (tier === 'auto') {
        // Intelligent tier selection based on data characteristics
        const targetTier = this.selectOptimalTier(key, value);
        await this.setInTier(key, value, targetTier, immediate);
      } else {
        await this.setInTier(key, value, tier, immediate);
      }

      // Emit data changed event
      this.eventSystem.emitEvent(
        'storage:data:changed',
        'StorageOrchestrator',
        { key, action: 'set', tier },
        'low'
      );

      return { success: true, data: { key, tier } };

    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  private async handleDelete(params: any, context: CommandContext): Promise<CommandResult> {
    const { key, allTiers = true } = params;

    try {
      if (allTiers) {
        await Promise.all([
          this.mmkvStorage.removeItem(key),
          this.hybridStorage.removeItem(key),
          this.supabaseStorage.removeItem(key)
        ]);
      } else {
        // Delete from each tier where it exists
        const hotVal = await this.mmkvStorage.getItem(key);
        const warmVal = await this.hybridStorage.getItem(key);
        const coldVal = await this.supabaseStorage.getItem(key);

        if (hotVal !== null && hotVal !== undefined) await this.mmkvStorage.removeItem(key);
        if (warmVal !== null && warmVal !== undefined) await this.hybridStorage.removeItem(key);
        if (coldVal !== null && coldVal !== undefined) await this.supabaseStorage.removeItem(key);
      }

      this.eventSystem.emitEvent(
        'storage:data:changed',
        'StorageOrchestrator',
        { key, action: 'delete' },
        'low'
      );

      return { success: true, data: { key, deleted: true } };

    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  private async handleQuery(params: any, context: CommandContext): Promise<CommandResult> {
    const { collection, filters, tier = 'warm' } = params;

    try {
      let results;

      switch (tier) {
        case 'warm':
          results = await this.hybridStorage.query(collection, filters);
          break;
        case 'cold':
          results = await this.supabaseStorage.query(collection, filters);
          break;
        default:
          throw new Error('Query operations only supported in warm and cold tiers');
      }

      return { success: true, data: results };

    } catch (error) {
      return { success: false, error: getErrorMessage(error) };
    }
  }

  private async handleSync(params: any, context: CommandContext): Promise<CommandResult> {
    try {
      await this.sync();
      return { success: true, data: { synced: true, timestamp: new Date() } };
    } catch (error: any) {
      return { success: false, error: getErrorMessage(error) };
    }
  }

  private async handleMigrate(params: any, context: CommandContext): Promise<CommandResult> {
    const { fromTier, toTier, pattern } = params;

    try {
      const migratedKeys = await this.migrateData(fromTier, toTier, pattern);

      return {
        success: true,
        data: {
          migratedKeys,
          count: migratedKeys.length
        }
      };
    } catch (error) {
      return { success: false, error: getErrorMessage(error) };
    }
  }

  private async handleClearCache(params: any, context: CommandContext): Promise<CommandResult> {
    try {
      await this.clearCaches();
      return { success: true, data: { cleared: true } };
    } catch (error) {
      return { success: false, error: getErrorMessage(error) };
    }
  }

  private async handleOptimize(params: any, context: CommandContext): Promise<CommandResult> {
    try {
      await this.optimizeStorage();
      return { success: true, data: { optimized: true } };
    } catch (error) {
      return { success: false, error: getErrorMessage(error) };
    }
  }

  // Storage Operations

  private async setInTier(
    key: string,
    value: any,
    tier: 'hot' | 'warm' | 'cold',
    immediate: boolean
  ): Promise<void> {
    switch (tier) {
      case 'hot':
        await this.mmkvStorage.setItem(key, value);
        break;
        case 'warm':
          await this.safeSetItem(this.hybridStorage, key, value);
          break;
      case 'cold':
        if (immediate) {
          await this.supabaseStorage.setItem(key, value);
        } else {
          this.queueOperation(() => this.supabaseStorage.setItem(key, value));
        }
        break;
    }
  }

  private selectOptimalTier(key: string, value: any): 'hot' | 'warm' | 'cold' {
    // Simple heuristics for tier selection
    const dataSize = JSON.stringify(value).length;

    // Session or frequently accessed data -> hot
    if (key.includes('session') || key.includes('current') || dataSize < 1024) {
      return 'hot';
    }

    // Recent data or medium size -> warm
    if (key.includes('recent') || dataSize < 50000) {
      return 'warm';
    }

    // Archive or large data -> cold
    return 'cold';
  }

  private shouldCacheInHot(data: any): boolean {
    const size = JSON.stringify(data).length;
    return size < this.config.compressionThreshold &&
           this.metrics.hotStorageUsage < this.config.hotStorageMaxSize * 1024 * 1024;
  }

  private async syncHotToWarm(): Promise<void> {
    // Implementation depends on your specific MMKV and WatermelonDB setup
    // This is a conceptual outline
    const hotKeys = await this.mmkvStorage.getAllKeys();

    for (const key of hotKeys) {
      if (this.shouldMoveToWarm(key)) {
        const value = await this.mmkvStorage.getItem(key);
        if (value !== undefined && value !== null) {
          await this.safeSetItem(this.hybridStorage, key, value);
        }
      }
    }
  }

  private async syncWarmToCold(): Promise<void> {
    // Sync data older than retention period to cold storage
    if (typeof this.hybridStorage.syncToCloud === 'function') {
      await this.hybridStorage.syncToCloud();
    } else {
      this.logger.warn('hybridStorage.syncToCloud not available, skipping warm->cold sync');
    }
  }

  // Safe wrappers to guard optional methods on storage implementations
  private async safeSetItem(storage: any, key: string, value: any): Promise<void> {
    try {
      if (!storage) return;

      // If storage exposes a domain-specific immediate API, prefer calling it directly
      if (typeof storage.saveMemoryPalaces === 'function') {
        try {
          await storage.saveMemoryPalaces(value);
          return;
        } catch (e) {
          // fallback to debounced setItem below
        }
      }

      if (typeof storage.setItem === 'function') {
        // Debounce/coalesce frequent writes to the same key to avoid write storms
        const existing = this.pendingWrites.get(key);
        if (existing) {
          clearTimeout(existing.timer);
        }

        const timer = setTimeout(async () => {
          try {
            await storage.setItem(key, this.pendingWrites.get(key)?.value);
          } catch (err) {
            this.logger.warn(`safeSetItem failed for key=${key}`, err);
          } finally {
            this.pendingWrites.delete(key);
          }
        }, this.writeDebounceMs) as unknown as NodeJS.Timeout;

        this.pendingWrites.set(key, { timer, value, storage });
        return;
      }

      // Warn once per key when storage doesn't support setItem
      if (!this.missingSetItemWarned.has(key)) {
        this.missingSetItemWarned.add(key);
        this.logger.warn(`safeSetItem: target storage missing setItem for key=${key}`);

        // clear the warning marker after a minute so we can log again if needed later
        setTimeout(() => this.missingSetItemWarned.delete(key), 60 * 1000);
      }
    } catch (error) {
      this.logger.warn(`safeSetItem failed for key=${key}`, error);
    }
  }

  // Flush a single pending write immediately
  private async flushPendingWrite(key: string): Promise<void> {
    const entry = this.pendingWrites.get(key);
    if (!entry) return;

    clearTimeout(entry.timer);
    try {
      if (entry.storage && typeof entry.storage.setItem === 'function') {
        await entry.storage.setItem(key, entry.value);
      }
    } catch (err) {
      this.logger.warn(`flushPendingWrite failed for key=${key}`, err);
    } finally {
      this.pendingWrites.delete(key);
    }
  }

  // Flush all pending writes (used on shutdown or before heavy operations)
  private async flushAllPendingWrites(): Promise<void> {
    const keys = Array.from(this.pendingWrites.keys());
    for (const key of keys) {
      try {
        await this.flushPendingWrite(key);
      } catch (e) {
        // ignore per-key flush errors but continue
      }
    }
  }

  private async safeGetItem(storage: any, key: string): Promise<any> {
    try {
      if (storage && typeof storage.getItem === 'function') {
        return await storage.getItem(key);
      }
      if (storage && typeof storage.getAllKeys === 'function') {
        // Not a direct get, but attempt to query
        const keys = await storage.getAllKeys();
        if (keys.includes(key) && typeof storage.getItem === 'function') {
          return await storage.getItem(key);
        }
      }
    } catch (error) {
      this.logger.warn(`safeGetItem failed for key=${key}`, error);
    }
    return null;
  }

  private shouldMoveToWarm(key: string): boolean {
    // Logic to determine if data should be moved from hot to warm
    return !key.includes('session') && !key.includes('current');
  }

  // Utility Methods

  private async calculateMetrics(): Promise<void> {
    try {
      // Calculate storage usage with fallbacks
      let hotSize = 0;
      let warmSize = 0;
      let coldSize = 0;

      try {
        hotSize = await this.mmkvStorage.getStorageSize?.() || 0;
      } catch (error) {
        // Ignore hot storage size errors
      }

      try {
        warmSize = await this.hybridStorage.getStorageSize?.() || 0;
      } catch (error) {
        // Ignore warm storage size errors
      }

      try {
        coldSize = await this.supabaseStorage.getStorageSize?.() || 0;
      } catch (error) {
        // Ignore cold storage size errors
      }

      this.metrics.hotStorageUsage = hotSize;
      this.metrics.warmStorageUsage = warmSize;
      this.metrics.coldStorageUsage = coldSize;

      // Calculate cache hit rate
      const totalRequests = this.cacheHits + this.cacheMisses;
      this.metrics.cacheHitRate = totalRequests > 0 ? this.cacheHits / totalRequests : 0;

    } catch (error) {
      // Silently handle metrics calculation errors to prevent spam
      // this.logger.warn('Failed to calculate storage metrics', error);
    }
  }

  private async gatherSessionData(): Promise<any> {
    // Gather current session data from various sources
    return {
      timestamp: new Date().toISOString(),
      userId: 'current_user', // Get from context
      activeModules: [], // Get from other orchestrators
      sessionProgress: {}, // Get from learning orchestrator
      // Add more session data as needed
    };
  }

  private queueOperation(operation: () => Promise<void>): void {
    this.operationQueue.push(operation);
  }

  private async processOperationQueue(): Promise<void> {
    if (this.isProcessingQueue || this.operationQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    try {
      // Process operations in batches
      const batch = this.operationQueue.splice(0, 5);

      await Promise.allSettled(batch.map(op => op()));

    } catch (error) {
      this.logger.error('Error processing operation queue', error);
    } finally {
      this.isProcessingQueue = false;
    }
  }

  private async performBackgroundSync(): Promise<void> {
    this.logger.debug('Performing background sync...');

    try {
      // Only sync if online and not under high load
      if (this.getStatus() !== 'error') {
        await this.sync();
      }
    } catch (error) {
      this.logger.warn('Background sync failed', error);
    }
  }

  private async optimizeStorage(): Promise<void> {
    this.logger.info('Optimizing storage...');

    // Clear expired data
    await this.clearExpiredData();

    // Compress large objects
    await this.compressLargeData();

    // Rebalance storage tiers
    await this.rebalanceStorageTiers();

    this.logger.info('Storage optimization completed');
  }

  private async clearExpiredData(): Promise<void> {
    // Implementation depends on your data structure
    // Remove data older than retention policies
  }

  private async compressLargeData(): Promise<void> {
    // Compress data larger than threshold
  }

  private async rebalanceStorageTiers(): Promise<void> {
    // Move data between tiers based on access patterns
  }

  private async migrateData(
    fromTier: string,
    toTier: string,
    pattern?: string
  ): Promise<string[]> {
    // Implementation for data migration between tiers
    const migratedKeys: string[] = [];

    // Add migration logic here

    return migratedKeys;
  }

  // Event Handlers

  private async handleDataChanged(event: NeuroLearnEvent): Promise<void> {
    // Handle data change events
    const { key, action } = event.data;

    if (action === 'set') {
      // Potentially trigger sync operations
      this.queueOperation(async () => {
        await this.syncSpecificKey(key);
      });
    }
  }

  private async syncSpecificKey(key: string): Promise<void> {
    // Sync specific key across tiers
    try {
      const value = await this.safeGetItem(this.hybridStorage, key);
      if (value !== undefined && value !== null) {
        try {
          if (typeof this.supabaseStorage.setItem === 'function') {
            await this.supabaseStorage.setItem(key, value);
          } else {
            this.logger.warn('supabaseStorage.setItem not available, skipping sync to cold');
          }
        } catch (e) {
          this.logger.warn('Failed to set item in supabaseStorage for key ' + key, e);
        }
      }
    } catch (error) {
      this.logger.warn(`Failed to sync key ${key}`, error);
    }
  }

  private async handleNetworkOnline(): Promise<void> {
    this.logger.info('Network online - starting sync operations');

    // Trigger immediate sync when network comes back
    this.queueOperation(() => this.sync());
  }

  private async handleNetworkOffline(): Promise<void> {
    this.logger.info('Network offline - entering offline mode');

    // Switch to offline-first operations
    // This is handled automatically by the hybrid storage service
  }

  private reduceBgOperations(): void {
    // Reduce background operations when cognitive load is high
    if (this.syncTimer) {
      clearInterval(this.syncTimer);

      // Restart with longer interval
      this.syncTimer = setInterval(async () => {
        try {
          await this.performBackgroundSync();
        } catch (error) {
          this.logger.warn('Background sync failed', error);
        }
      }, this.config.autoSyncInterval * 2 * 60 * 1000);
    }
  }
}

export default StorageOrchestrator;
