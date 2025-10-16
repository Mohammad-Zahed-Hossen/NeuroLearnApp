/**
 * SmartCacheManager - Multi-tier caching system for optimal performance
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
  priority: 'hot' | 'warm' | 'cold';
}

interface CacheConfig {
  maxMemorySize: number; // MB
  maxDiskSize: number; // MB
  hotCacheTTL: number; // milliseconds
  warmCacheTTL: number; // milliseconds
  coldCacheTTL: number; // milliseconds
}

export class SmartCacheManager {
  private static instance: SmartCacheManager;
  private memoryCache = new Map<string, CacheEntry<any>>();
  private sizeCache = new Map<string, number>();
  private config: CacheConfig;
  private currentMemorySize = 0;

  private constructor() {
    this.config = {
      maxMemorySize: 50, // 50MB
      maxDiskSize: 200, // 200MB
      hotCacheTTL: 5 * 60 * 1000, // 5 minutes
      warmCacheTTL: 30 * 60 * 1000, // 30 minutes
      coldCacheTTL: 24 * 60 * 60 * 1000, // 24 hours
    };
  }

  public static getInstance(): SmartCacheManager {
    if (!SmartCacheManager.instance) {
      SmartCacheManager.instance = new SmartCacheManager();
    }
    return SmartCacheManager.instance;
  }

  private estimateSize(data: any, keyHint?: string): number {
    // Use cached size when available (by key) to avoid repeated serialization
    if (keyHint && this.sizeCache.has(keyHint)) return this.sizeCache.get(keyHint)!;

    try {
      // Avoid serializing extremely large objects repeatedly. If object has a
      // `__size` hint or `length`/`byteLength`, use that as a fast path.
      if (data && typeof data === 'object') {
        if (typeof (data as any).__size === 'number') {
          return (data as any).__size;
        }
        if (Array.isArray(data)) {
          // estimate per-item cost conservatively
          const smallSample = data.slice(0, 5);
          const sampleSize = JSON.stringify(smallSample).length * 2;
          const est = Math.max(256, Math.floor((sampleSize / smallSample.length) * data.length));
          if (keyHint) this.sizeCache.set(keyHint, est);
          return est;
        }
      }

      const size = JSON.stringify(data).length * 2;
      if (keyHint) this.sizeCache.set(keyHint, size);
      return size;
    } catch (error) {
      // Fallback conservative estimate
      return 1024;
    }
  }

  private isExpired(entry: CacheEntry<any>): boolean {
    const now = Date.now();
    const ttl = this.getTTL(entry.priority);
    return now - entry.timestamp > ttl;
  }

  private getTTL(priority: 'hot' | 'warm' | 'cold'): number {
    switch (priority) {
      case 'hot': return this.config.hotCacheTTL;
      case 'warm': return this.config.warmCacheTTL;
      case 'cold': return this.config.coldCacheTTL;
    }
  }

  private evictLRU(): void {
    if (this.memoryCache.size === 0) return;

    let oldestKey = '';
    let oldestTime = Date.now();

    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      const entry = this.memoryCache.get(oldestKey);
      if (entry) {
        this.currentMemorySize -= this.estimateSize(entry.data);
        this.memoryCache.delete(oldestKey);
      }
    }
  }

  private async getDiskCache<T>(key: string): Promise<T | null> {
    try {
      const stored = await AsyncStorage.getItem(`cache_${key}`);
      if (!stored) return null;

      const entry: CacheEntry<T> = JSON.parse(stored);
      if (this.isExpired(entry)) {
        await AsyncStorage.removeItem(`cache_${key}`);
        return null;
      }

      return entry.data;
    } catch (error) {
      console.warn('Disk cache read failed:', error);
      return null;
    }
  }

  private async setDiskCache<T>(key: string, entry: CacheEntry<T>): Promise<void> {
    try {
      await AsyncStorage.setItem(`cache_${key}`, JSON.stringify(entry));
    } catch (error) {
      console.warn('Disk cache write failed:', error);
    }
  }

  public async get<T>(key: string): Promise<T | null> {
    // Check memory cache first
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry && !this.isExpired(memoryEntry)) {
      memoryEntry.accessCount++;
      memoryEntry.lastAccessed = Date.now();
      return memoryEntry.data;
    }

    // Check disk cache
    const diskData = await this.getDiskCache<T>(key);
    if (diskData) {
      // Promote to memory cache if it's frequently accessed
      await this.set(key, diskData, 'warm');
      return diskData;
    }

    return null;
  }

  public async set<T>(
    key: string,
    data: T,
    priority: 'hot' | 'warm' | 'cold' = 'warm'
  ): Promise<void> {
    const now = Date.now();
    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      accessCount: 1,
      lastAccessed: now,
      priority,
    };

  const size = this.estimateSize(data, key);
    const maxSizeBytes = this.config.maxMemorySize * 1024 * 1024;

    // Memory cache for hot and warm data
    if (priority === 'hot' || priority === 'warm') {
      // Evict if necessary
      while (this.currentMemorySize + size > maxSizeBytes && this.memoryCache.size > 0) {
        this.evictLRU();
      }

      if (this.currentMemorySize + size <= maxSizeBytes) {
        this.memoryCache.set(key, entry);
        this.currentMemorySize += size;
      }
    }

    // Always store in disk cache for persistence
    await this.setDiskCache(key, entry);
  }

  public async delete(key: string): Promise<void> {
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry) {
      this.currentMemorySize -= this.estimateSize(memoryEntry.data);
      this.memoryCache.delete(key);
    }

    try {
      await AsyncStorage.removeItem(`cache_${key}`);
    } catch (error) {
      console.warn('Disk cache delete failed:', error);
    }
  }

  public async clear(): Promise<void> {
    this.memoryCache.clear();
    this.currentMemorySize = 0;

    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith('cache_'));
      await AsyncStorage.multiRemove(cacheKeys);
    } catch (error) {
      console.warn('Cache clear failed:', error);
    }
  }

  public getStats() {
    return {
      memoryEntries: this.memoryCache.size,
      memorySize: this.currentMemorySize,
      memoryUtilization: (this.currentMemorySize / (this.config.maxMemorySize * 1024 * 1024)) * 100,
    };
  }

  public async cleanup(): Promise<void> {
    // Remove expired entries
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.memoryCache.entries()) {
      if (this.isExpired(entry)) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      await this.delete(key);
    }
  }

  public async invalidate(pattern: string): Promise<void> {
    // Invalidate memory cache entries matching the pattern
    const memoryKeysToDelete: string[] = [];
    for (const key of this.memoryCache.keys()) {
      if (key.startsWith(pattern)) {
        memoryKeysToDelete.push(key);
      }
    }
    for (const key of memoryKeysToDelete) {
      await this.delete(key);
    }

    // Invalidate disk cache entries matching the pattern
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeysToDelete = allKeys.filter(key =>
        key.startsWith(`cache_${pattern}`)
      );
      if (cacheKeysToDelete.length > 0) {
        await AsyncStorage.multiRemove(cacheKeysToDelete);
      }
    } catch (error) {
      console.warn('Disk cache invalidate failed:', error);
    }
  }
}
