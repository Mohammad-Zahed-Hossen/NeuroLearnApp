/**
 * BackgroundSyncService - Manages non-blocking background synchronization
 *
 * Handles background sync operations for integration services like Todoist and Notion
 * Provides queue management, conflict resolution, and sync status monitoring
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { TodoistService } from './integrations/TodoistService';
import NotionSyncService from './integrations/NotionSyncService';
import { SmartCacheManager } from '../utils/SmartCacheManager';

interface SyncOperation {
  id: string;
  service: 'todoist' | 'notion';
  operation: 'sync' | 'update' | 'create' | 'delete';
  data: any;
  priority: 'low' | 'medium' | 'high';
  createdAt: Date;
  retryCount: number;
  maxRetries: number;
}

interface SyncStatus {
  isActive: boolean;
  currentOperation: SyncOperation | null;
  queueLength: number;
  lastSyncTime: Date | null;
  successCount: number;
  failureCount: number;
  pendingOperations: SyncOperation[];
}

export class BackgroundSyncService {
  private static instance: BackgroundSyncService;
  private syncQueue: SyncOperation[] = [];
  private isProcessing = false;
  private syncStatus: SyncStatus;
  private cacheManager: SmartCacheManager;
  private todoistService: TodoistService;
  private notionService: NotionSyncService;
  private syncInterval: NodeJS.Timeout | null = null;

  // Configuration
  private readonly MAX_QUEUE_SIZE = 100;
  private readonly SYNC_INTERVAL_MS = 30000; // 30 seconds
  private readonly MAX_RETRIES = 3;
  private readonly STORAGE_KEY = 'background_sync_queue';

  private constructor() {
    this.cacheManager = SmartCacheManager.getInstance();
    this.todoistService = TodoistService.getInstance();
    this.notionService = NotionSyncService.getInstance();

    this.syncStatus = {
      isActive: false,
      currentOperation: null,
      queueLength: 0,
      lastSyncTime: null,
      successCount: 0,
      failureCount: 0,
      pendingOperations: []
    };

    this.initializeService();
  }

  public static getInstance(): BackgroundSyncService {
    if (!BackgroundSyncService.instance) {
      BackgroundSyncService.instance = new BackgroundSyncService();
    }
    return BackgroundSyncService.instance;
  }

  private async initializeService(): Promise<void> {
    try {
      // Load persisted queue
      await this.loadPersistedQueue();

      // Start background sync interval
      this.startBackgroundSync();

      console.log('🔄 BackgroundSyncService initialized');
    } catch (error) {
      console.error('❌ Failed to initialize BackgroundSyncService:', error);
    }
  }

  /**
   * Add operation to background sync queue
   */
  public async enqueueOperation(
    service: 'todoist' | 'notion',
    operation: 'sync' | 'update' | 'create' | 'delete',
    data: any,
    priority: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<void> {
    const syncOp: SyncOperation = {
      id: `${service}_${operation}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      service,
      operation,
      data,
      priority,
      createdAt: new Date(),
      retryCount: 0,
      maxRetries: this.MAX_RETRIES
    };

    // Add to queue with priority ordering
    this.syncQueue.push(syncOp);
    this.syncQueue.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    // Enforce queue size limit
    if (this.syncQueue.length > this.MAX_QUEUE_SIZE) {
      this.syncQueue = this.syncQueue.slice(0, this.MAX_QUEUE_SIZE);
    }

    this.syncStatus.queueLength = this.syncQueue.length;
    this.syncStatus.pendingOperations = [...this.syncQueue];

    // Persist queue
    await this.persistQueue();

    console.log(`📋 Enqueued ${service} ${operation} operation: ${syncOp.id}`);

    // Trigger immediate processing if not already running
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  /**
   * Process the sync queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.syncQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    this.syncStatus.isActive = true;

    try {
      while (this.syncQueue.length > 0) {
        const operation = this.syncQueue.shift()!;
        this.syncStatus.currentOperation = operation;
        this.syncStatus.queueLength = this.syncQueue.length;

        try {
          await this.executeOperation(operation);
          this.syncStatus.successCount++;
          this.syncStatus.lastSyncTime = new Date();

          console.log(`✅ Background sync operation completed: ${operation.id}`);

        } catch (error) {
          console.error(`❌ Background sync operation failed: ${operation.id}`, error);

          operation.retryCount++;
          this.syncStatus.failureCount++;

          if (operation.retryCount < operation.maxRetries) {
            // Re-queue with exponential backoff
            const delay = Math.pow(2, operation.retryCount) * 1000; // 1s, 2s, 4s
            setTimeout(() => {
              this.syncQueue.unshift(operation);
              this.syncStatus.queueLength = this.syncQueue.length;
            }, delay);
          } else {
            console.warn(`🚫 Max retries exceeded for operation: ${operation.id}`);
          }
        }
      }
    } finally {
      this.isProcessing = false;
      this.syncStatus.isActive = false;
      this.syncStatus.currentOperation = null;
      await this.persistQueue();
    }
  }

  /**
   * Execute a single sync operation
   */
  private async executeOperation(operation: SyncOperation): Promise<void> {
    const { service, operation: opType, data } = operation;

    switch (service) {
      case 'todoist':
        await this.executeTodoistOperation(opType, data);
        break;
      case 'notion':
        await this.executeNotionOperation(opType, data);
        break;
      default:
        throw new Error(`Unknown service: ${service}`);
    }
  }

  /**
   * Execute Todoist-specific operations
   */
  private async executeTodoistOperation(operation: string, data: any): Promise<void> {
    switch (operation) {
      case 'sync':
        // Full sync operation
        await this.todoistService.getTasks();
        break;
      case 'update':
        if (data.taskId && data.updates) {
          await this.todoistService.updateTask(data.taskId, data.updates);
          // Invalidate cache for this task
          await this.cacheManager.delete(`todoist_task_${data.taskId}`);
        }
        break;
      case 'create':
        if (data.task) {
          await this.todoistService.createTask(data.task);
        }
        break;
      case 'delete':
        if (data.taskId) {
          await this.todoistService.deleteTask(data.taskId);
          // Invalidate cache for this task
          await this.cacheManager.delete(`todoist_task_${data.taskId}`);
        }
        break;
      default:
        throw new Error(`Unknown Todoist operation: ${operation}`);
    }
  }

  /**
   * Execute Notion-specific operations
   */
  private async executeNotionOperation(operation: string, data: any): Promise<void> {
    switch (operation) {
      case 'sync':
        // Incremental sync
        await this.notionService.syncPages('incremental');
        break;
      case 'update':
        // Handle page/block updates if needed
        break;
      default:
        throw new Error(`Unknown Notion operation: ${operation}`);
    }
  }

  /**
   * Start background sync interval
   */
  private startBackgroundSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(() => {
      this.processQueue();
    }, this.SYNC_INTERVAL_MS);

    console.log('⏰ Background sync interval started');
  }

  /**
   * Stop background sync
   */
  public stopBackgroundSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    console.log('⏹️ Background sync stopped');
  }

  /**
   * Get current sync status
   */
  public getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  /**
   * Clear all pending operations
   */
  public async clearQueue(): Promise<void> {
    this.syncQueue = [];
    this.syncStatus.queueLength = 0;
    this.syncStatus.pendingOperations = [];
    await this.persistQueue();
    console.log('🗑️ Background sync queue cleared');
  }

  /**
   * Force immediate sync processing
   */
  public async forceSyncNow(): Promise<void> {
    await this.processQueue();
  }

  /**
   * Persist queue to storage
   */
  private async persistQueue(): Promise<void> {
    try {
      const queueData = this.syncQueue.map(op => ({
        ...op,
        createdAt: op.createdAt.toISOString()
      }));
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(queueData));
    } catch (error) {
      console.warn('Failed to persist sync queue:', error);
    }
  }

  /**
   * Load persisted queue from storage
   */
  private async loadPersistedQueue(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const queueData = JSON.parse(stored);
        this.syncQueue = queueData.map((op: any) => ({
          ...op,
          createdAt: new Date(op.createdAt)
        }));
        this.syncStatus.queueLength = this.syncQueue.length;
        this.syncStatus.pendingOperations = [...this.syncQueue];
      }
    } catch (error) {
      console.warn('Failed to load persisted sync queue:', error);
    }
  }

  /**
   * Cleanup service
   */
  public destroy(): void {
    this.stopBackgroundSync();
    this.clearQueue();
    console.log('💥 BackgroundSyncService destroyed');
  }
}

export default BackgroundSyncService;
