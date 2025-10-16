/**
 * RequestDeduplicator - Prevents duplicate API requests for the same resource
 *
 * Uses a Map to track ongoing requests and returns the same promise for duplicate requests
 * Includes TTL-based cleanup to prevent memory leaks
 */

export interface DeduplicationConfig {
  ttlMs: number; // Time to live for cached requests
  maxCacheSize: number; // Maximum number of cached requests
}

export interface CachedRequest<T = any> {
  promise: Promise<T>;
  timestamp: number;
  key: string;
}

export class RequestDeduplicator {
  private cache = new Map<string, CachedRequest>();
  private cleanupTimer: NodeJS.Timeout | undefined;

  constructor(private config: DeduplicationConfig = { ttlMs: 30000, maxCacheSize: 100 }) {
    this.startCleanupTimer();
  }

  /**
   * Execute a request with deduplication
   * If a request with the same key is already in progress, returns the existing promise
   */
  async execute<T>(
    key: string,
    requestFn: () => Promise<T>,
    forceRefresh = false
  ): Promise<T> {
    // Check if we have a cached request
    const cached = this.cache.get(key);

    if (!forceRefresh && cached && !this.isExpired(cached)) {
      console.log(`🔄 Using cached request for key: ${key}`);
      return cached.promise;
    }

    // Remove expired entry if it exists
    if (cached) {
      this.cache.delete(key);
    }

    // Create new request
    const promise = this.createDeduplicatedRequest(key, requestFn);

    // Cache the request
    this.cache.set(key, {
      promise,
      timestamp: Date.now(),
      key
    });

    // Enforce cache size limit
    this.enforceCacheSize();

    return promise;
  }

  /**
   * Check if a cached request is expired
   */
  private isExpired(cached: CachedRequest): boolean {
    return Date.now() - cached.timestamp > this.config.ttlMs;
  }

  /**
   * Create a deduplicated request that cleans up cache on completion
   */
  private async createDeduplicatedRequest<T>(
    key: string,
    requestFn: () => Promise<T>
  ): Promise<T> {
    try {
      const result = await requestFn();
      return result;
    } finally {
      // Clean up cache entry after request completes (success or failure)
      this.cache.delete(key);
    }
  }

  /**
   * Enforce maximum cache size by removing oldest entries
   */
  private enforceCacheSize(): void {
    if (this.cache.size <= this.config.maxCacheSize) {
      return;
    }

    // Sort entries by timestamp and remove oldest
    const entries = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => a.timestamp - b.timestamp);

    const toRemove = entries.slice(0, this.cache.size - this.config.maxCacheSize);
    toRemove.forEach(([key]) => this.cache.delete(key));
  }

  /**
   * Manually clear a specific cached request
   */
  clear(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cached requests
   */
  clearAll(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  /**
   * Start periodic cleanup of expired entries
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpired();
    }, this.config.ttlMs / 4); // Clean up 4 times per TTL period
  }

  /**
   * Clean up expired entries
   */
  private cleanupExpired(): void {
    const now = Date.now();
    const toDelete: string[] = [];

    for (const [key, cached] of this.cache.entries()) {
      if (now - cached.timestamp > this.config.ttlMs) {
        toDelete.push(key);
      }
    }

    toDelete.forEach(key => this.cache.delete(key));

    if (toDelete.length > 0) {
      console.log(`🧹 Cleaned up ${toDelete.length} expired cached requests`);
    }
  }

  /**
   * Stop the cleanup timer (for cleanup)
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    this.clearAll();
  }
}

/**
 * Singleton instance for global deduplication
 */
export const globalRequestDeduplicator = new RequestDeduplicator();
