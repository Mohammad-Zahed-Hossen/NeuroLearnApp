/**
 *  StorageService with Cognitive Aura 2.0 Context Storage Support
 *
 * This  storage service adds support for the new CAE 2.0 context sensing
 * capabilities, including environmental snapshots, pattern learning data, and
 * predictive analytics storage.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { HybridStorageService } from './HybridStorageService';
import { SupabaseStorageService } from './SupabaseStorageService';
import SupabaseService from './SupabaseService';
import { PerformanceProfiler } from '../../core/utils/PerformanceProfiler';
import { EventSystem } from '../../core/EventSystem';
import { base64Encode, base64Decode } from '../../utils/base64';
import { LogicStructure } from '../learning/MindMapGeneratorService';
import { FSRSCard, FSRSReviewLog } from '../learning/SpacedRepetitionService';
import { ReadingSession, SourceLink } from '../learning/SpeedReadingService';
import { ContextSnapshot, TimeIntelligence, LocationContext, DigitalBodyLanguage } from '../ai/ContextSensorService';
import { Flashcard, Settings, StudySession, ProgressData, Task, MemoryPalace } from '../../types';

// ==================== CAE 2.0: Context Storage Interfaces ====================

/**
 * Context snapshot storage format
 */
export interface StoredContextSnapshot {
  id: string;
  sessionId: string;
  timestamp: string; // ISO string
  timeIntelligence: TimeIntelligence;
  locationContext: LocationContext;
  digitalBodyLanguage: DigitalBodyLanguage;
  overallOptimality: number;
  contextQualityScore: number;
  deviceState: {
    batteryLevel: number;
    isCharging: boolean;
    networkQuality: string;
  };
  userId?: string;
}

/**
 * Learned pattern storage
 */
export interface LearnedPattern {
  id: string;
  type: 'optimal_time' | 'productive_location' | 'context_sequence' | 'performance_correlation';
  pattern: {
    triggers: Record<string, any>;
    outcomes: Record<string, any>;
    frequency: number;
    confidence: number;
  };
  lastSeen: string; // ISO string
  effectiveness: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Optimal learning window data
 */
export interface OptimalLearningWindow {
  id: string;
  circadianHour: number; // 0-24
  dayOfWeek: number; // 0-6
  performanceScore: number; // 0-1
  frequency: number; // How often this window occurs
  lastPerformance: number;
  lastSeen: string; // ISO string
  createdAt: string;
  updatedAt: string;
}

/**
 * Known location data
 */
export interface KnownLocation {
  id: string;
  name: string;
  coordinates: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  environment: LocationContext['environment'];
  performanceHistory: number[];
  averagePerformance: number;
  visitCount: number;
  lastVisit: string; // ISO string
  createdAt: string;
  updatedAt: string;
}

/**
 * Cognitive forecasting model data
 */
export interface CognitiveForecasting {
  id: string;
  modelVersion: string;
  predictedContext: string;
  predictedOptimality: number;
  predictionHorizon: number; // Minutes ahead
  actualContext?: string;
  actualOptimality?: number;
  predictionAccuracy?: number;
  createdAt: string;
  evaluatedAt?: string;
}

/**
 * Cognitive sample data
 */
export interface CognitiveSample {
  timestamp: number;
  gazeStability: number;
  headStillness: number;
  blinkRate: number;
  confidence?: number;
  environmentalContext: {
    timeIntelligence: TimeIntelligence;
    locationContext: LocationContext;
    digitalBodyLanguage: DigitalBodyLanguage;
    batteryLevel: number;
    isCharging: boolean;
    networkQuality: string;
  };
}

/**
 * Processed cognitive metrics
 */
export interface ProcessedMetrics {
  timestamp: number;
  rawAttention: number;
  filteredAttention: number;
  cognitiveLoad: number;
  stressIndicators: number[];
  qualityScore: number;
}

/**
 * Session statistics
 */
export interface SessionStats {
  startTime: number;
  duration: number;
  averageAttention: number;
  peakAttention: number;
  lowAttention: number;
  stabilityScore: number;
  interruptions: number;
}

/**
 * Cognitive log data
 */
export interface CognitiveLog {
  userId: string;
  samples: CognitiveSample[];
  processedMetrics: ProcessedMetrics[];
  sessionStats: SessionStats;
}

/**
 * User profile data for profile screen
 */
export interface UserProfile {
  id: string;
  name: string;
  description: string;
  avatar?: string; // URL or base64 data
  email?: string;
  createdAt: string;
  updatedAt: string;
}

// ==================== REQUEST CACHING INTERFACES ====================

/**
 * Cache entry with TTL and compression support
 */
export interface CacheEntry<T = any> {
  key: string;
  data: T;
  timestamp: number; // Unix timestamp in milliseconds
  ttl: number; // Time to live in milliseconds
  compressed: boolean;
  size: number; // Size in bytes
  accessCount: number;
  lastAccessed: number;
  metadata: Record<string, any>;
}

/**
 * Cache configuration
 */
export interface CacheConfig {
  maxSize: number; // Maximum cache size in bytes
  defaultTTL: number; // Default TTL in milliseconds
  compressionThreshold: number; // Minimum size for compression in bytes
  cleanupInterval: number; // Cleanup interval in milliseconds
}

/**
 * Cache statistics
 */
export interface CacheStats {
  totalEntries: number;
  totalSize: number;
  hitRate: number;
  missRate: number;
  compressionRatio: number;
  lastCleanup: number;
}

// ==================== Existing Interfaces ====================

export interface SoundSettings {
  volume: number;
  lastPreset?: string;
  optimalProfile?: Record<string, any>;
  personalizationEnabled?: boolean;
  updatedAt?: string;
}

export interface NeuralLogEntry {
  id: string;
  sessionId?: string;
  preset?: string;
  timestamp: string; // ISO
  metrics?: { cognitiveLoad?: number; entrainmentScore?: number };
  notes?: string;
}

export interface DistractionEvent {
  id: string;
  sessionId: string;
  timestamp: Date;
  reason?: string;
  contextSwitch?: boolean;
  duration?: number;
  triggerType?: 'internal' | 'external' | 'notification' | 'unknown';
  severity?: 1 | 2 | 3 | 4 | 5;
}

export interface FocusSession {
  id: string;
  taskId: string;
  nodeId?: string;
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
  plannedDurationMinutes: number;
  distractionCount: number;
  distractionEvents: DistractionEvent[];
  selfReportFocus: 1 | 2 | 3 | 4 | 5;
  distractionReason?: string;
  completionRate: number;
  cognitiveLoadStart: number;
  cognitiveLoadEnd?: number;
  focusLockUsed: boolean;
  todoistTaskCompleted?: boolean;
  neuralNodeStrengthened?: boolean;
  created: Date;
  modified: Date;
}

export interface FocusHealthMetrics {
  streakCount: number;
  averageFocusRating: number;
  distractionsPerSession: number;
  focusEfficiency: number;
  neuralReinforcement: number;
  dailyFocusTime: number;
  weeklyFocusTime: number;
  bestFocusTimeOfDay: string;
  commonDistractionTriggers: string[];
  mostDistractiveDays: string[];
  focusImprovement: number;
}

export interface LogicNode {
  id: string;
  customId?: string; // legacy ID support
  question: string;
  premise1: string;
  premise2: string;
  conclusion: string;
  type: 'deductive' | 'inductive' | 'abductive';
  domain: 'programming' | 'math' | 'english' | 'general';
  difficulty: 1 | 2 | 3 | 4 | 5;
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReviewDate: Date;
  lastAccessed: Date;
  totalAttempts: number;
  correctAttempts: number;
  accessCount: number;
  stability?: number;
  fsrsDifficulty?: number;
  lastReview?: Date;
  state?: number;
  focusSessionStrength?: number;
  distractionPenalty?: number;
  created: Date;
  modified: Date;
}

export interface EnhancedFlashcard extends Flashcard {
  stability?: number;
  fsrsDifficulty?: number;
  lastReview?: Date;
  state?: number;
  lapses?: number;
  elapsed_days?: number;
  scheduled_days?: number;
  focusSessionStrength?: number;
  distractionWeakening?: number;
}

/**
 * Neuroplasticity session data for tracking synapse strengthening sessions
 */
export interface NeuroplasticitySession {
  id: string;
  sessionType: 'synapse_strengthening' | 'pathway_building' | 'cluster_integration';
  targetEdgeIds: string[];
  startTime: Date;
  endTime?: Date;
  completedTasks: number;
  successRate: number;
  cognitiveStrain: number;
  plasticityGains: Array<{ edgeId: string; strengthDelta: number }>;
  adaptationsTriggered: string[];
  nextSessionRecommendations: string[];
}

/**
 * Synapse data for storing neural connection information
 */
export interface SynapseData {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  strength: number; // 0-1 normalized
  lastPracticeDate: Date;
  practiceCount: number;
  retentionRate: number;
  plasticityScore: number;
  urgencyLevel: 'critical' | 'moderate' | 'stable';
  connectionType: 'association' | 'prerequisite' | 'similarity' | 'logical' | 'temporal';
  microTasksGenerated: number;
  strengthHistory: Array<{ date: Date; strength: number }>;
  neuralPathways: string[];
  cognitiveLoad: number;
  lastReviewResult: 'success' | 'partial' | 'failed' | null;
}

/**
 *  StorageService with CAE 2.0 Support
 * Maintains backward compatibility while adding anticipatory learning capabilities
 */
export class StorageService {
  private static instance: StorageService;
  private hybridService: HybridStorageService | null = null;
  // Request deduplication cache: key -> Promise
  private requestCache: Map<string, Promise<any>> = new Map();

  // ==================== REQUEST CACHING PROPERTIES ====================
  private cache: Map<string, CacheEntry> = new Map();
  private cacheConfig: CacheConfig = {
    maxSize: 50 * 1024 * 1024, // 50MB default
    defaultTTL: 5 * 60 * 1000, // 5 minutes
    compressionThreshold: 1024, // 1KB
    cleanupInterval: 10 * 60 * 1000, // 10 minutes
  };
  private cacheStats = {
    totalHits: 0,
    totalMisses: 0,
    totalSize: 0,
    lastCleanup: Date.now(),
  };
  private cleanupTimer: NodeJS.Timeout | null = null;

  public static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  private constructor() {
    // Lazy initialization to avoid circular dependency
    this.initializeCache();
  }

  private getHybridService(): HybridStorageService {
    if (!this.hybridService) {
      this.hybridService = HybridStorageService.getInstance();
    }
    return this.hybridService;
  }

  // ==================== REQUEST CACHING METHODS ====================

  /**
   * Initialize the cache system
   */
  private initializeCache(): void {
    // Load cached data from persistent storage
    this.loadCacheFromStorage();

    // Set up periodic cleanup
    this.scheduleCleanup();
  }

  /**
   * Load cache data from persistent storage
   */
  private async loadCacheFromStorage(): Promise<void> {
    try {
      const cachedData = await AsyncStorage.getItem('neurolearn_cache');
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        if (parsed.entries && Array.isArray(parsed.entries)) {
          parsed.entries.forEach((entry: CacheEntry) => {
            // Only load non-expired entries
            if (Date.now() < entry.timestamp + entry.ttl) {
              this.cache.set(entry.key, entry);
              this.cacheStats.totalSize += entry.size;
            }
          });
        }
        if (parsed.stats) {
          this.cacheStats = { ...this.cacheStats, ...parsed.stats };
        }
      }
    } catch (error) {
      // Silently fail if cache loading fails
      console.warn('Failed to load cache from storage:', error);
    }
  }

  /**
   * Save cache data to persistent storage
   */
  private async saveCacheToStorage(): Promise<void> {
    try {
      const entries = Array.from(this.cache.values());
      const data = {
        entries,
        stats: this.cacheStats,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem('neurolearn_cache', JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save cache to storage:', error);
    }
  }

  /**
   * Schedule periodic cache cleanup
   */
  private scheduleCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.cleanupTimer = setInterval(() => {
      this.performCacheCleanup();
    }, this.cacheConfig.cleanupInterval);
  }

  /**
   * Compress data using base64 encoding for large responses
   */
  private compressData(data: any): { compressed: string; originalSize: number } {
    const jsonString = JSON.stringify(data);
    const originalSize = jsonString.length;
    const compressed = base64Encode(jsonString); // Simple base64 compression
    return { compressed, originalSize };
  }

  /**
   * Decompress data from base64
   */
  private decompressData(compressed: string): any {
    try {
      const jsonString = base64Decode(compressed);
      return JSON.parse(jsonString);
    } catch (error) {
      throw new Error('Failed to decompress cache data');
    }
  }

  /**
   * Calculate size of data in bytes
   */
  private calculateSize(data: any): number {
    return JSON.stringify(data).length;
  }

  /**
   * Get cache entry with TTL check
   */
  private getCacheEntry<T>(key: string): CacheEntry<T> | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) {
      this.cacheStats.totalMisses++;
      return null;
    }

    // Check if entry has expired
    if (Date.now() > entry.timestamp + entry.ttl) {
      this.cache.delete(key);
      this.cacheStats.totalSize -= entry.size;
      this.cacheStats.totalMisses++;
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.cacheStats.totalHits++;

    return entry;
  }

  /**
   * Set cache entry with size management
   */
  private setCacheEntry<T>(key: string, data: T, ttl?: number, metadata?: Record<string, any>): void {
    const size = this.calculateSize(data);
    const shouldCompress = size > this.cacheConfig.compressionThreshold;

    let processedData: any = data;
    let compressed = false;

    if (shouldCompress) {
      try {
        const compression = this.compressData(data);
        processedData = compression.compressed;
        compressed = true;
      } catch (error) {
        // Fallback to uncompressed if compression fails
        console.warn('Cache compression failed, using uncompressed data');
      }
    }

    const entry: CacheEntry<T> = {
      key,
      data: processedData,
      timestamp: Date.now(),
      ttl: ttl || this.cacheConfig.defaultTTL,
      compressed,
      size,
      accessCount: 0,
      lastAccessed: Date.now(),
      metadata: metadata || {},
    };

    // Remove existing entry if present
    const existing = this.cache.get(key);
    if (existing) {
      this.cacheStats.totalSize -= existing.size;
    }

    // Check if we need to evict entries to make room
    if (this.cacheStats.totalSize + size > this.cacheConfig.maxSize) {
      this.evictCacheEntries(size);
    }

    this.cache.set(key, entry);
    this.cacheStats.totalSize += size;
  }

  /**
   * Evict cache entries using LRU policy
   */
  private evictCacheEntries(requiredSpace: number): void {
    const entries = Array.from(this.cache.entries());

    // Sort by last accessed time (oldest first)
    entries.sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);

    let freedSpace = 0;
    for (const [key, entry] of entries) {
      if (freedSpace >= requiredSpace) break;

      this.cache.delete(key);
      this.cacheStats.totalSize -= entry.size;
      freedSpace += entry.size;
    }
  }

  /**
   * Perform cache cleanup (remove expired entries)
   */
  private performCacheCleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.timestamp + entry.ttl) {
        this.cache.delete(key);
        this.cacheStats.totalSize -= entry.size;
        cleanedCount++;
      }
    }

    this.cacheStats.lastCleanup = now;

    // Save updated cache to storage
    if (cleanedCount > 0) {
      this.saveCacheToStorage();
    }
  }

  /**
   * Cache API response with TTL
   */
  async cacheApiResponse<T>(key: string, data: T, ttl?: number, metadata?: Record<string, any>): Promise<void> {
    this.setCacheEntry(key, data, ttl, metadata);
    // Persist cache changes
    await this.saveCacheToStorage();
  }

  /**
   * Get cached API response
   */
  async getCachedApiResponse<T>(key: string): Promise<T | null> {
    const entry = this.getCacheEntry<T>(key);
    if (!entry) return null;

    try {
      let data = entry.data;
      if (entry.compressed) {
        data = this.decompressData(entry.data as string);
      }
      return data;
    } catch (error) {
      // Remove corrupted entry
      this.cache.delete(key);
      this.cacheStats.totalSize -= entry.size;
      return null;
    }
  }

  /**
   * Invalidate cache entry
   */
  async invalidateCacheEntry(key: string): Promise<void> {
    const entry = this.cache.get(key);
    if (entry) {
      this.cache.delete(key);
      this.cacheStats.totalSize -= entry.size;
      await this.saveCacheToStorage();
    }
  }

  /**
   * Clear all cache entries
   */
  async clearCache(): Promise<void> {
    this.cache.clear();
    this.cacheStats.totalSize = 0;
    this.cacheStats.totalHits = 0;
    this.cacheStats.totalMisses = 0;
    await AsyncStorage.removeItem('neurolearn_cache');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): CacheStats {
    const totalRequests = this.cacheStats.totalHits + this.cacheStats.totalMisses;
    const hitRate = totalRequests > 0 ? this.cacheStats.totalHits / totalRequests : 0;
    const missRate = totalRequests > 0 ? this.cacheStats.totalMisses / totalRequests : 0;

    // Calculate compression ratio
    let compressedSize = 0;
    let originalSize = 0;
    for (const entry of this.cache.values()) {
      if (entry.compressed) {
        compressedSize += JSON.stringify(entry.data).length;
        originalSize += entry.size;
      }
    }
    const compressionRatio = originalSize > 0 ? compressedSize / originalSize : 1;

    return {
      totalEntries: this.cache.size,
      totalSize: this.cacheStats.totalSize,
      hitRate,
      missRate,
      compressionRatio,
      lastCleanup: this.cacheStats.lastCleanup,
    };
  }

  /**
   * Update cache configuration
   */
  updateCacheConfig(config: Partial<CacheConfig>): void {
    this.cacheConfig = { ...this.cacheConfig, ...config };

    // Reschedule cleanup if interval changed
    if (config.cleanupInterval) {
      this.scheduleCleanup();
    }

    // Trigger cleanup if max size reduced
    if (config.maxSize && config.maxSize < this.cacheStats.totalSize) {
      this.performCacheCleanup();
    }
  }

  // ==================== CAE 2.0: CONTEXT STORAGE METHODS ====================

  /**
   * Store context snapshot for pattern learning and analytics
  *
  * IMPORTANT: All producers of environmental/context snapshots (CAE 2.0)
  * must call `StorageService.getInstance().saveContextSnapshot(snapshot)`
  * so the snapshot flows through the HybridStorageService hot→warm→cold
  * pipeline. Direct writes to the warm DB or AsyncStorage will bypass
  * merge/conflict resolution, queueing for cold sync, telemetry, and
  * retention/cleanup policies — please use the facade to ensure
  * consistent behavior across the CAE stack.
   */
  async saveContextSnapshot(snapshot: ContextSnapshot): Promise<void> {
    const storedSnapshot: StoredContextSnapshot = {
      id: `context_${snapshot.timestamp.getTime()}_${Math.random().toString(36).substr(2, 9)}`,
      sessionId: snapshot.sessionId,
      timestamp: snapshot.timestamp.toISOString(),
      timeIntelligence: snapshot.timeIntelligence,
      locationContext: {
        ...snapshot.locationContext,
        coordinates: snapshot.locationContext.coordinates || { latitude: 0, longitude: 0 },
      },
      digitalBodyLanguage: snapshot.digitalBodyLanguage,
      overallOptimality: snapshot.overallOptimality,
      contextQualityScore: snapshot.contextQualityScore,
      deviceState: {
        batteryLevel: snapshot.batteryLevel,
        isCharging: snapshot.isCharging,
        networkQuality: snapshot.networkQuality,
      },
    };

    return this.getHybridService().saveContextSnapshot(storedSnapshot);
  }

  /**
   * Get context snapshots for analysis
   */
  async getContextSnapshots(
    startDate?: Date,
    endDate?: Date,
    limit?: number
  ): Promise<StoredContextSnapshot[]> {
    return this.getHybridService().getContextSnapshots?.(startDate, endDate, limit) || [];
  }

  /**
   * Get context analytics for a specific time period
   */
  async getContextAnalytics(days: number = 30): Promise<{
    totalSnapshots: number;
    averageOptimality: number;
    optimalTimePatterns: Array<{
      hour: number;
      dayOfWeek: number;
      frequency: number;
      averageOptimality: number;
    }>;
    locationEffectiveness: Array<{
      environment: string;
      averageOptimality: number;
      frequency: number;
    }>;
    dblPatterns: Array<{
      state: string;
      frequency: number;
      averageOptimality: number;
    }>;
  }> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000));

    const snapshots = await this.getContextSnapshots(startDate, endDate);

    if (snapshots.length === 0) {
      return {
        totalSnapshots: 0,
        averageOptimality: 0,
        optimalTimePatterns: [],
        locationEffectiveness: [],
        dblPatterns: [],
      };
    }

    const totalOptimality = snapshots.reduce((sum, s) => sum + s.overallOptimality, 0);
    const averageOptimality = totalOptimality / snapshots.length;

    // Analyze time patterns
    const timePatterns = new Map<string, { optimality: number; count: number }>();
    const locationPatterns = new Map<string, { optimality: number; count: number }>();
    const dblPatterns = new Map<string, { optimality: number; count: number }>();

    snapshots.forEach(snapshot => {
      // Time patterns
      const timeKey = `${snapshot.timeIntelligence.circadianHour.toFixed(0)}_${snapshot.timeIntelligence.dayOfWeek}`;
      const existing = timePatterns.get(timeKey) || { optimality: 0, count: 0 };
      timePatterns.set(timeKey, {
        optimality: existing.optimality + snapshot.overallOptimality,
        count: existing.count + 1,
      });

      // Location patterns
      const locExisting = locationPatterns.get(snapshot.locationContext.environment) || { optimality: 0, count: 0 };
      locationPatterns.set(snapshot.locationContext.environment, {
        optimality: locExisting.optimality + snapshot.overallOptimality,
        count: locExisting.count + 1,
      });

      // DBL patterns
      const dblExisting = dblPatterns.get(snapshot.digitalBodyLanguage.state) || { optimality: 0, count: 0 };
      dblPatterns.set(snapshot.digitalBodyLanguage.state, {
        optimality: dblExisting.optimality + snapshot.overallOptimality,
        count: dblExisting.count + 1,
      });
    });

    return {
      totalSnapshots: snapshots.length,
      averageOptimality,
      optimalTimePatterns: Array.from(timePatterns.entries()).map(([key, data]) => {
        const [hourStr, dayOfWeekStr] = key.split('_');
        return {
          hour: parseInt(hourStr || '0'),
          dayOfWeek: parseInt(dayOfWeekStr || '0'),
          frequency: data.count,
          averageOptimality: data.optimality / data.count,
        };
      }),
      locationEffectiveness: Array.from(locationPatterns.entries()).map(([environment, data]) => ({
        environment,
        averageOptimality: data.optimality / data.count,
        frequency: data.count,
      })),
      dblPatterns: Array.from(dblPatterns.entries()).map(([state, data]) => ({
        state,
        frequency: data.count,
        averageOptimality: data.optimality / data.count,
      })),
    };
  }

  /**
   * Save learned pattern
   */
  async saveLearnedPattern(pattern: Omit<LearnedPattern, 'id' | 'createdAt' | 'updatedAt'>): Promise<LearnedPattern> {
    const now = new Date().toISOString();
    const savedPattern: LearnedPattern = {
      ...pattern,
      id: `pattern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: now,
      updatedAt: now,
    };

    await this.getHybridService().saveLearnedPattern?.(savedPattern);
    return savedPattern;
  }

  // ==================== GENERIC ITEM PASS-THROUGH ====================
  // Expose a minimal getItem/setItem pair so existing modules that
  // rely on ad-hoc AsyncStorage keys can use the StorageService facade
  // instead of reaching into HybridStorageService directly.
  async getItem(key: string): Promise<any> {
    // Check cache first for API responses
    const cached = await this.getCachedApiResponse(key);
    if (cached !== null) {
      return cached;
    }

    // Request deduplication for read operations
    const cacheKey = `getItem:${key}`;
    if (this.requestCache.has(cacheKey)) {
      return this.requestCache.get(cacheKey);
    }

    const promise = this.getHybridService().getItem(key);
    this.requestCache.set(cacheKey, promise);

    // Cache the result if it's an API response
    promise.then(result => {
      if (result !== null && result !== undefined) {
        // Cache API responses with default TTL
        this.cacheApiResponse(key, result);
      }
    });

    // Clean up cache after promise resolves
    promise.finally(() => {
      this.requestCache.delete(cacheKey);
    });

    return promise;
  }

  async setItem(key: string, value: any): Promise<void> {
    // Update cache if this is a cached API response
    if (value !== null && value !== undefined) {
      await this.cacheApiResponse(key, value);
    }
    return this.getHybridService().setItem(key, value);
  }

  /**
   * Remove an item from storage. Use HybridService if available; fall back to AsyncStorage.
   */
  async removeItem(key: string): Promise<void> {
    try {
      const svc: any = this.getHybridService();
      if (svc && typeof svc.removeItem === 'function') return svc.removeItem(key);
    } catch (e) {
      // continue to fallback
    }
    try {
      await AsyncStorage.removeItem(key);
    } catch (e) {
      // swallow
    }
  }

  // ==================== USER PROGRESS FACADE ====================
  async getUserProgress(userId: string): Promise<any | null> {
    return this.getHybridService().getUserProgress?.(userId) ?? null;
  }

  async saveUserProgress(userId: string, progress: any): Promise<void> {
    return this.getHybridService().saveUserProgress?.(userId, progress);
  }

  /**
   * Get learned patterns
   */
  async getLearnedPatterns(type?: LearnedPattern['type']): Promise<LearnedPattern[]> {
    const patterns = await this.getHybridService().getLearnedPatterns?.() || [];
    return type ? patterns.filter(p => p.type === type) : patterns;
  }

  /**
   * Save optimal learning window
   */
  async saveOptimalLearningWindow(window: Omit<OptimalLearningWindow, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
    const now = new Date().toISOString();
    const savedWindow: OptimalLearningWindow = {
      ...window,
      id: `window_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: now,
      updatedAt: now,
    };

    return this.getHybridService().saveOptimalLearningWindow?.(savedWindow);
  }

  /**
   * Get optimal learning windows
   */
  async getOptimalLearningWindows(): Promise<OptimalLearningWindow[]> {
    return this.getHybridService().getOptimalLearningWindows?.() || [];
  }

  /**
   * Save known location
   */
  async saveKnownLocation(location: Omit<KnownLocation, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
    const now = new Date().toISOString();
    const savedLocation: KnownLocation = {
      ...location,
      id: `location_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: now,
      updatedAt: now,
    };

    return this.getHybridService().saveKnownLocation?.(savedLocation);
  }

  /**
   * Get known locations
   */
  async getKnownLocations(): Promise<KnownLocation[]> {
    return this.getHybridService().getKnownLocations?.() || [];
  }

  /**
   * Save cognitive forecasting result
   */
  async saveCognitiveForecast(forecast: Omit<CognitiveForecasting, 'id' | 'createdAt'>): Promise<void> {
    const savedForecast: CognitiveForecasting = {
      ...forecast,
      id: `forecast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
    };

    return this.getHybridService().saveCognitiveForecast?.(savedForecast);
  }

  /**
   * Get cognitive forecasting accuracy metrics
   */
  async getForecastingMetrics(days: number = 7): Promise<{
    totalForecasts: number;
    averageAccuracy: number;
    accuracyByHorizon: Record<number, number>;
    modelPerformance: Record<string, number>;
  }> {
    const forecasts = await this.getHybridService().getCognitiveForecasts?.() || [];
    const recentForecasts = forecasts.filter(f =>
      f.evaluatedAt &&
      new Date(f.evaluatedAt) > new Date(Date.now() - (days * 24 * 60 * 60 * 1000))
    );

    if (recentForecasts.length === 0) {
      return {
        totalForecasts: 0,
        averageAccuracy: 0,
        accuracyByHorizon: {},
        modelPerformance: {},
      };
    }

    const totalAccuracy = recentForecasts.reduce((sum, f) => sum + (f.predictionAccuracy || 0), 0);
    const averageAccuracy = totalAccuracy / recentForecasts.length;

    // Group by prediction horizon
    const horizonGroups = new Map<number, number[]>();
    const modelGroups = new Map<string, number[]>();

    recentForecasts.forEach(forecast => {
      if (forecast.predictionAccuracy !== undefined) {
        // By horizon
        const existing = horizonGroups.get(forecast.predictionHorizon) || [];
        existing.push(forecast.predictionAccuracy);
        horizonGroups.set(forecast.predictionHorizon, existing);

        // By model version
        const modelExisting = modelGroups.get(forecast.modelVersion) || [];
        modelExisting.push(forecast.predictionAccuracy);
        modelGroups.set(forecast.modelVersion, modelExisting);
      }
    });

    const accuracyByHorizon: Record<number, number> = {};
    horizonGroups.forEach((accuracies, horizon) => {
      accuracyByHorizon[horizon] = accuracies.reduce((sum, acc) => sum + acc, 0) / accuracies.length;
    });

    const modelPerformance: Record<string, number> = {};
    modelGroups.forEach((accuracies, model) => {
      modelPerformance[model] = accuracies.reduce((sum, acc) => sum + acc, 0) / accuracies.length;
    });

    return {
      totalForecasts: recentForecasts.length,
      averageAccuracy,
      accuracyByHorizon,
      modelPerformance,
    };
  }

  // ==================== EXISTING METHODS (Maintained for backward compatibility) ====================

  async saveSettings(settings: Settings): Promise<void> {
    return this.getHybridService().saveSettings(settings);
  }

  async getSettings(): Promise<Settings> {
    // Request deduplication for read operations
    const cacheKey = 'getSettings';
    if (this.requestCache.has(cacheKey)) {
      return this.requestCache.get(cacheKey);
    }

    const promise = this.getHybridService().getSettings();
    this.requestCache.set(cacheKey, promise);

    // Clean up cache after promise resolves
    promise.finally(() => {
      this.requestCache.delete(cacheKey);
    });

    return promise;
  }

  // ==================== FLASHCARDS ====================
  async saveFlashcards(flashcards: (Flashcard | Flashcard)[]): Promise<void> {
    return this.getHybridService().saveFlashcards(flashcards);
  }

  async getFlashcards(): Promise<(Flashcard | Flashcard)[]> {
    // Request deduplication for read operations
    const cacheKey = 'getFlashcards';
    if (this.requestCache.has(cacheKey)) {
      return this.requestCache.get(cacheKey);
    }

    const promise = this.getHybridService().getFlashcards() as Promise<(Flashcard | Flashcard)[]>;
    this.requestCache.set(cacheKey, promise);

    // Clean up cache after promise resolves
    promise.finally(() => {
      this.requestCache.delete(cacheKey);
    });

    return promise;
  }

  // Batch operation for multiple flashcards
  async batchSaveFlashcards(flashcards: (Flashcard | Flashcard)[]): Promise<void> {
    return this.getHybridService().saveFlashcards(flashcards);
  }

  // ==================== LOGIC NODES ====================
  async saveLogicNodes(nodes: LogicNode[]): Promise<void> {
    return this.getHybridService().saveLogicNodes(nodes);
  }

  async getLogicNodes(): Promise<LogicNode[]> {
    // Request deduplication for read operations
    const cacheKey = 'getLogicNodes';
    if (this.requestCache.has(cacheKey)) {
      return this.requestCache.get(cacheKey);
    }

    const promise = this.getHybridService().getLogicNodes();
    this.requestCache.set(cacheKey, promise);

    // Clean up cache after promise resolves
    promise.finally(() => {
      this.requestCache.delete(cacheKey);
    });

    return promise;
  }

  // Batch operation for multiple logic nodes
  async batchSaveLogicNodes(nodes: LogicNode[]): Promise<void> {
    return this.getHybridService().saveLogicNodes(nodes);
  }

  async addLogicNode(nodeData: Partial<LogicNode>): Promise<LogicNode | null> {
    return this.getHybridService().addLogicNode(nodeData);
  }

  async updateLogicNode(nodeId: string, updates: Partial<LogicNode>): Promise<LogicNode | null> {
    return this.getHybridService().updateLogicNode(nodeId, updates);
  }

  // ==================== FOCUS SESSIONS ====================
  async saveFocusSession(session: FocusSession): Promise<void> {
    return this.getHybridService().saveFocusSession(session);
  }

  async recordFocusSession(sessionData: any): Promise<void> {
    return this.getHybridService().recordFocusSession?.(sessionData);
  }

  async getFocusSessions(): Promise<FocusSession[]> {
    // Request deduplication for read operations
    const cacheKey = 'getFocusSessions';
    if (this.requestCache.has(cacheKey)) {
      return this.requestCache.get(cacheKey);
    }

    const promise = this.getHybridService().getFocusSessions();
    this.requestCache.set(cacheKey, promise);

    // Clean up cache after promise resolves
    promise.finally(() => {
      this.requestCache.delete(cacheKey);
    });

    return promise;
  }

  // Batch operation for multiple focus sessions
  async batchSaveFocusSessions(sessions: FocusSession[]): Promise<void> {
    return this.getHybridService().saveFocusSessions(sessions);
  }

  async getSleepEntries(userId: string, days: number = 30): Promise<any[]> {
    return this.getHybridService().getSleepEntries?.(userId, days) || [];
  }

  async saveSleepEntries(userId: string, entries: any[]): Promise<void> {
    return this.getHybridService().saveSleepEntries?.(userId, entries);
  }

  async getCognitiveMetrics(userId: string): Promise<any[]> {
    return this.getHybridService().getCognitiveMetrics?.(userId) || [];
  }

  async saveCognitiveMetrics(userId: string, metrics: any[]): Promise<void> {
    return this.getHybridService().saveCognitiveMetrics?.(userId, metrics);
  }

  async saveCognitiveSession(sessionId: string, log: CognitiveLog): Promise<void> {
    return this.getHybridService().saveCognitiveSession?.(sessionId, log);
  }

  async getHealthMetrics(userId: string): Promise<any | null> {
    return this.getHybridService().getHealthMetrics?.(userId) || null;
  }

  async saveHealthMetrics(userId: string, metrics: any): Promise<void> {
    return this.getHybridService().saveHealthMetrics?.(userId, metrics);
  }

  async getFocusSession(sessionId: string): Promise<FocusSession | null> {
    return this.getHybridService().getFocusSession(sessionId);
  }

  async saveDistractionEvent(event: DistractionEvent): Promise<void> {
    return this.getHybridService().saveDistractionEvent(event);
  }

  async getDistractionEvents(sessionId?: string): Promise<DistractionEvent[]> {
    return this.getHybridService().getDistractionEvents(sessionId);
  }

  async saveFocusHealthMetrics(metrics: FocusHealthMetrics): Promise<void> {
    return this.getHybridService().saveFocusHealthMetrics(metrics);
  }

  async getFocusHealthMetrics(): Promise<FocusHealthMetrics | null> {
    // HybridStorageService returns a non-null FocusHealthMetrics by design
    // Promote to non-nullable here to match existing callers which expect values
    return this.getHybridService().getFocusHealthMetrics();
  }

  // ==================== DASHBOARD / UTILITIES PROXIES ====================
  async getCardsDueToday(): Promise<{
    flashcards: (Flashcard | Flashcard)[];
    logicNodes: LogicNode[];
    criticalLogicCount: number;
  }> {
    return this.getHybridService().getCardsDueToday?.() || { flashcards: [], logicNodes: [], criticalLogicCount: 0 };
  }

  async calculateCurrentStudyStreak(): Promise<number> {
    return this.getHybridService().calculateCurrentStudyStreak?.() ?? 0;
  }

  async pruneOldFocusData(olderThanDays: number = 90): Promise<void> {
    return this.getHybridService().pruneOldFocusData?.(olderThanDays);
  }

  // ==================== READING SESSIONS ====================
  async saveReadingSession(session: ReadingSession): Promise<void> {
    return this.getHybridService().saveReadingSession(session);
  }

  async getReadingSessions(): Promise<ReadingSession[]> {
    // Request deduplication for read operations
    const cacheKey = 'getReadingSessions';
    if (this.requestCache.has(cacheKey)) {
      return this.requestCache.get(cacheKey);
    }

    const promise = this.getHybridService().getReadingSessions();
    this.requestCache.set(cacheKey, promise);

    // Clean up cache after promise resolves
    promise.finally(() => {
      this.requestCache.delete(cacheKey);
    });

    return promise;
  }

  // Batch operation for multiple reading sessions
  async batchSaveReadingSessions(sessions: ReadingSession[]): Promise<void> {
    return this.getHybridService().saveReadingSessions(sessions);
  }

  // ==================== READING PERFORMANCE ====================
  async recordReadingPerformance(performanceData: {
    textId: string;
    wpm: number;
    comprehensionScore: number;
    timeSpent: number;
    timestamp: Date;
    source: string;
  }): Promise<void> {
    try {
      const key = 'reading_performance_data';
      const existing = await this.getItem(key) || [];
      existing.push({
        ...performanceData,
        recordedAt: new Date().toISOString(),
      });
      return this.setItem(key, existing);
    } catch (error) {
      console.error('Error recording reading performance:', error);
    }
  }

  async getReadingPerformance(): Promise<Array<{
    textId: string;
    wpm: number;
    comprehensionScore: number;
    timeSpent: number;
    timestamp: Date;
    source: string;
    recordedAt: string;
  }>> {
    try {
      const data = await this.getItem('reading_performance_data') || [];
      return data.map((item: any) => ({
        ...item,
        timestamp: new Date(item.timestamp),
      }));
    } catch (error) {
      console.error('Error getting reading performance:', error);
      return [];
    }
  }

  async saveSourceLinks(links: SourceLink[]): Promise<void> {
    return this.getHybridService().saveSourceLinks(links);
  }

  async getSourceLinks(): Promise<SourceLink[]> {
    // Request deduplication for read operations
    const cacheKey = 'getSourceLinks';
    if (this.requestCache.has(cacheKey)) {
      return this.requestCache.get(cacheKey);
    }

    const promise = this.getHybridService().getSourceLinks();
    this.requestCache.set(cacheKey, promise);

    // Clean up cache after promise resolves
    promise.finally(() => {
      this.requestCache.delete(cacheKey);
    });

    return promise;
  }

  // ==================== SOUND SETTINGS ====================
  async saveSoundSettings(settings: SoundSettings): Promise<void> {
    return this.getHybridService().saveSoundSettings(settings);
  }

  async getSoundSettings(): Promise<SoundSettings | null> {
    return this.getHybridService().getSoundSettings();
  }

  async appendNeuralLog(entry: NeuralLogEntry): Promise<void> {
    return this.getHybridService().appendNeuralLog(entry);
  }

  async getNeuralLogs(): Promise<NeuralLogEntry[]> {
    // Request deduplication for read operations
    const cacheKey = 'getNeuralLogs';
    if (this.requestCache.has(cacheKey)) {
      return this.requestCache.get(cacheKey);
    }

    const promise = this.getHybridService().getNeuralLogs();
    this.requestCache.set(cacheKey, promise);

    // Clean up cache after promise resolves
    promise.finally(() => {
      this.requestCache.delete(cacheKey);
    });

    return promise;
  }

  // ==================== LEGACY COMPATIBILITY STUBS ====================
  async getStudySessions(): Promise<StudySession[]> {
    return this.getHybridService().getStudySessions?.() || [];
  }

  async saveStudySession(session: StudySession): Promise<void> {
    return this.getHybridService().saveStudySession?.(session);
  }

  async saveStudySessions(sessions: StudySession[]): Promise<void> {
    return this.getHybridService().saveStudySessions?.(sessions);
  }
  async getProgressData(): Promise<ProgressData> {
    return {
      studyStreak: 1,
      totalFocusTime: 0,
      todayFocusTime: 0,
      lastStudyDate: new Date().toDateString(),
      retentionRate: 0,
      masteredCards: 0,
      completedSessions: 0,
      weeklyData: [],
    };
  }
  async saveProgressData(progress: ProgressData): Promise<void> {}
  async getTasks(limit?: number, offset?: number): Promise<Task[]> {
    const allTasks = await this.getHybridService().getTasks?.() || [];
    if (limit !== undefined && offset !== undefined) {
      return allTasks.slice(offset, offset + limit);
    }
    return allTasks;
  }

  async saveTasks(tasks: Task[]): Promise<void> {
    return this.getHybridService().saveTasks?.(tasks);
  }
  async getMemoryPalaces(): Promise<MemoryPalace[]> {
    return this.getHybridService().getMemoryPalaces?.() || [];
  }

  async saveMemoryPalaces(palaces: MemoryPalace[]): Promise<void> {
    return this.getHybridService().saveMemoryPalaces?.(palaces);
  }

  async clearAllData(): Promise<void> {
    return this.getHybridService().clearAllData();
  }

  async exportAllData(): Promise<string> {
    const data = {
      // Existing data
      flashcards: await this.getFlashcards(),
      logicNodes: await this.getLogicNodes(),
      focusSessions: await this.getFocusSessions(),
      readingSessions: await this.getReadingSessions(),
      settings: await this.getSettings(),

      // CAE 2.0 data
      contextSnapshots: await this.getContextSnapshots(),
      learnedPatterns: await this.getLearnedPatterns(),
      optimalLearningWindows: await this.getOptimalLearningWindows(),
      knownLocations: await this.getKnownLocations(),

      // Cache data
      cache: {
        entries: Array.from(this.cache.values()),
        stats: this.cacheStats,
        config: this.cacheConfig,
      },

      exportDate: new Date().toISOString(),
      version: '2.2.0',
      caeVersion: '2.0',
    };

    return JSON.stringify(data, null, 2);
  }

  async getStorageInfo(): Promise<{ keys: string[]; estimatedSize: number; }> {
    const info = await this.getHybridService().getStorageInfo();
    return {
      keys: ['hybrid-storage', 'context-snapshots', 'learned-patterns'],
      estimatedSize: info.cacheSize,
    };
  }

  // ==================== BACKGROUND SYNC CAPABILITIES ====================

  /**
   * Trigger background sync manually
   */
  async triggerBackgroundSync(): Promise<{ synced: number; failed: number }> {
    return this.getHybridService().backgroundSync();
  }

  /**
   * Get current sync status
   */
  async getSyncStatus(): Promise<{ isOnline: boolean; queueSize: number; lastSyncAt?: number }> {
    const info = await this.getHybridService().getStorageInfo();
    return {
      isOnline: info.isOnline,
      queueSize: info.queueSize,
      // Note: lastSyncAt would need to be tracked separately in hybrid service
    };
  }

  /**
   * Perform storage cleanup
   */
  /**
   * Perform storage cleanup and disk space management
   */
  async performStorageCleanup(): Promise<{ hotCleaned: number; warmCleaned: number; freedSpace: number }> {
    // Call hybrid cleanup
    const result = await this.getHybridService().performStorageCleanup();
    // Estimate freed space (mock, replace with actual disk space API if available)
    const freedSpace = 1024 * 1024; // 1MB for example
    // Optionally notify user if space is low
    if (freedSpace < 5 * 1024 * 1024) {
      // TODO: Integrate with UI notification system
      console.warn('Device storage is low. Please clear cache or old data.');
    }
    return { ...result, freedSpace };
  }
  /**
   * Estimate available disk space (mock implementation)
   */
  async getAvailableDiskSpace(): Promise<number> {
    // TODO: Use platform-specific API for real disk space
    return 10 * 1024 * 1024; // 10MB for example
  }
  /**
   * Check disk space before write
   */
  async ensureDiskSpace(required: number): Promise<boolean> {
    const available = await this.getAvailableDiskSpace();
    if (available < required) {
      // Optionally notify user
      console.warn('Insufficient disk space for operation.');
      return false;
    }
    return true;
  }

  /**
   * Reset sound optimal profiles (proxy to hybrid service)
   */
  async resetOptimalProfiles(): Promise<void> {
    return this.getHybridService().resetOptimalProfiles?.();
  }

  // ==================== USER PREFERENCES METHODS ====================

  /**
   * Get user preferences for various services
   */
  async getUserPreferences(): Promise<any> {
    return this.getItem('user_preferences') || {};
  }

  /**
   * Save user preferences for various services
   */
  async saveUserPreferences(preferences: any): Promise<void> {
    return this.setItem('user_preferences', preferences);
  }

  // ==================== USER PROFILE METHODS ====================

  /**
   * Get user profile data
   */
  async getUserProfile(userId?: string): Promise<UserProfile | null> {
    try {
      const currentUser = await SupabaseService.getInstance().getCurrentUser();
      const targetUserId = userId || currentUser?.id;

      if (!targetUserId) {
        return null;
      }

      // Try to get from Supabase first
      const { data: supabaseProfile, error } = await SupabaseService.getInstance().getClient()
        .from('user_profiles')
        .select('id, name, description, avatar, email, created_at, updated_at')
        .eq('id', targetUserId)
        .single();

      if (!error && supabaseProfile) {
        return {
          id: supabaseProfile.id,
          name: supabaseProfile.name || 'NeuroLearn User',
          description: supabaseProfile.description || 'Learning enthusiast',
          avatar: supabaseProfile.avatar,
          email: supabaseProfile.email,
          createdAt: supabaseProfile.created_at,
          updatedAt: supabaseProfile.updated_at,
        };
      }

      // Fallback to local storage
      const localProfile = await this.getItem(`user_profile_${targetUserId}`);
      if (localProfile) {
        return localProfile;
      }

      // Return default profile
      return {
        id: targetUserId,
        name: 'NeuroLearn User',
        description: 'Learning enthusiast',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  }

  /**
   * Save user profile data
   */
  async saveUserProfile(profile: Partial<UserProfile>): Promise<void> {
    try {
      const currentUser = await SupabaseService.getInstance().getCurrentUser();
      if (!currentUser?.id) {
        throw new Error('No authenticated user');
      }

      const now = new Date().toISOString();
      const profileData = {
        id: currentUser.id,
        name: profile.name,
        description: profile.description,
        avatar: profile.avatar,
        email: profile.email,
        updated_at: now,
      };

      // Save to Supabase
      const { error } = await SupabaseService.getInstance().getClient()
        .from('user_profiles')
        .upsert(profileData);

      if (error) {
        console.warn('Failed to save profile to Supabase, falling back to local storage:', error);
        // Fallback to local storage
        await this.setItem(`user_profile_${currentUser.id}`, {
          ...profile,
          id: currentUser.id,
          createdAt: profile.createdAt || now,
          updatedAt: now,
        });
      }
    } catch (error) {
      console.error('Error saving user profile:', error);
      throw error;
    }
  }

  // Health-related methods for AdvancedSleepService and HabitFormationService
  async getLastSleepEntry(userId: string): Promise<any> {
    // Return mock data for now - implement actual storage later
    return null;
  }

  async getUserHealthProfile(userId: string): Promise<any> {
    // Return mock data for now - implement actual storage later
    return {
      userId,
      sleepGoal: 8,
      stressLevel: 0.5,
      energyLevel: 0.7,
      lastUpdated: new Date()
    };
  }

  async getMovementData(userId: string, days: number): Promise<any[]> {
    // Return mock data for now - implement actual storage later
    return [];
  }

  async getHabit(userId: string, habitId: string): Promise<any> {
    // Return mock data for now - implement actual storage later
    return null;
  }

  async getHabitCompletionHistory(userId: string, habitId: string, days: number): Promise<any[]> {
    // Return mock data for now - implement actual storage later
    return [];
  }

  async getUserHabits(userId: string): Promise<any[]> {
    // Return mock data for now - implement actual storage later
    return [];
  }

  async getRewardHistory(userId: string, days: number): Promise<any[]> {
    // Return mock data for now - implement actual storage later
    return [];
  }

  /**
   * Get usage analytics data for personalization
   */
  async getUsageAnalytics(): Promise<{
    flashcardsUsage: number;
    focusTimerUsage: number;
    logicTrainingUsage: number;
    audioUsage: number;
    visualUsage: number;
    averagePerformance: number;
  }> {
    try {
      // Get focus sessions for timer usage
      const focusSessions = await this.getFocusSessions();
      const focusTimerUsage = focusSessions.length;

      // Get flashcards for usage count
      const flashcards = await this.getFlashcards();
      const flashcardsUsage = flashcards.length;

      // Get logic nodes for training usage
      const logicNodes = await this.getLogicNodes();
      const logicTrainingUsage = logicNodes.length;

      // Calculate average performance from focus sessions
      const averagePerformance = focusSessions.length > 0
        ? focusSessions.reduce((sum, session) => sum + session.selfReportFocus, 0) / focusSessions.length / 5
        : 0.5;

      // Get sound settings to determine audio vs visual preference
      const soundSettings = await this.getSoundSettings();
      const audioUsage = soundSettings ? 1 : 0; // Simple heuristic
      const visualUsage = soundSettings ? 0 : 1; // Opposite of audio

      return {
        flashcardsUsage,
        focusTimerUsage,
        logicTrainingUsage,
        audioUsage,
        visualUsage,
        averagePerformance,
      };
    } catch (error) {
      console.error('Error getting usage analytics:', error);
      // Return default values
      return {
        flashcardsUsage: 0,
        focusTimerUsage: 0,
        logicTrainingUsage: 0,
        audioUsage: 0,
        visualUsage: 1,
        averagePerformance: 0.5,
      };
    }
  }

  /**
   * Record palace usage for analytics
   */
  async recordPalaceUsage(usageData: {
    palaceId: string;
    studyMode: string;
    timestamp: Date;
    sessionDuration: number;
  }): Promise<void> {
    try {
      const key = 'palace_usage_data';
      const existing = await this.getItem(key) || [];
      existing.push(usageData);
      return this.setItem(key, existing);
    } catch (error) {
      console.error('Error recording palace usage:', error);
    }
  }

  /**
   * Record logic performance data
   */
  async recordLogicPerformance(performanceData: any): Promise<void> {
    // Store in local storage for now - could be extended to sync with backend
    const key = 'logic_performance_data';
    const existing = await this.getItem(key) || [];
    existing.push({
      ...performanceData,
      recordedAt: new Date().toISOString(),
    });
    return this.setItem(key, existing);
  }
}

// Maintain backward compatibility
// Remove the duplicate class declaration to fix duplicate identifier error

export default StorageService;
