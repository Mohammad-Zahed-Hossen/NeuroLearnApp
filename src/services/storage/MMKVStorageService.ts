/**
 * MMKVStorageService
 * Lightweight wrapper around react-native-mmkv with a graceful fallback to
 * AsyncStorage when MMKV is unavailable (useful during development or in CI).
 *
 * Purpose for this incremental change:
 * - Provide a hot-cache API for small, frequent items (context snapshots, counters)
 * - Do not break the existing app if native MMKV is not installed
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

type MaybeMMKV = {
  set: (key: string, value: string) => void;
  getString: (key: string) => string | undefined | null;
  delete: (key: string) => void;
  getAllKeys?: () => string[];
};

class MMKVStorageService {
  private static instance: MMKVStorageService;
  private mmkv: MaybeMMKV | null = null;
  private isUsingMMKV = false;
  // When MMKV encounters persistent errors (like SQLITE_FULL) we temporarily
  // disable use of MMKV for a cooldown period to avoid repeated failing writes.
  private unhealthyUntil: number | null = null;

  private constructor() {
    // Try to require MMKV dynamically so the import won't crash if the package
    // isn't installed yet. If it's not available, we'll fall back to AsyncStorage.
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
      const { MMKV } = require('react-native-mmkv');
      // Create a default instance with a safe id (no encryption by default)
      // Consumers may override with their own instance if needed.
      // NOTE: native installation is required for production use.
      // eslint-disable-next-line new-cap
      const store = new MMKV({ id: 'neurolearn-hot-cache' }) as any;
      this.mmkv = store as MaybeMMKV;
      this.isUsingMMKV = true;
    } catch (err: any) {
      // MMKV not available or failed to initialize. Detect the common
      // TurboModules/new-architecture error message and provide a clearer
      // diagnostic to developers while falling back to AsyncStorage.
      const message = err?.message || String(err);
      if (message.includes('requires TurboModules') || message.includes('new architecture')) {
        // Use debug to avoid alarming warnings in production logs; developers
        // can enable debug logging to see this message during development.
        console.debug(
          'react-native-mmkv initialization note: new-architecture required for MMKV 3.x. Falling back to AsyncStorage. See RN new-architecture docs.',
        );
      } else {
        console.debug('react-native-mmkv not available, falling back to AsyncStorage:', err);
      }

      this.mmkv = null;
      this.isUsingMMKV = false;
    }
  }

  /**
   * Force-disable MMKV usage at runtime (useful for tests or environment overrides)
   */
  public disableMMKV(): void {
    this.isUsingMMKV = false;
    this.mmkv = null;
  }

  public static getInstance(): MMKVStorageService {
    if (!MMKVStorageService.instance) {
      MMKVStorageService.instance = new MMKVStorageService();
    }
    return MMKVStorageService.instance;
  }

  public isAvailable(): boolean {
    const now = Date.now();
    if (this.unhealthyUntil && now < this.unhealthyUntil) return false;
    return this.isUsingMMKV && this.mmkv !== null;
  }

  /** Mark MMKV as unhealthy for the given cooldown period (ms). */
  public markUnhealthy(cooldownMs: number = 5 * 60 * 1000): void {
    try {
      this.unhealthyUntil = Date.now() + cooldownMs;
      this.isUsingMMKV = false;
      this.mmkv = null;
      console.warn(`MMKVStorageService: marked unhealthy for ${cooldownMs}ms`);
    } catch (e) {
      // ignore
    }
  }

  public async setItem(key: string, value: string): Promise<void> {
    // Ensure we always pass a string to storage backends. Accepts string or serializable value.
    const toStore = typeof value === 'string' ? value : JSON.stringify(value);

    if (this.mmkv && this.isAvailable()) {
      try {
        this.mmkv.set(key, toStore);
        return;
      } catch (e: any) {
        // If MMKV reports disk full, mark unhealthy to avoid repeated noisy failures
        const msg = String(e?.message || e);
        console.warn('MMKV set failed, falling back to AsyncStorage:', e);
        if (msg.includes('SQLITE_FULL') || msg.toLowerCase().includes('database or disk is full')) {
          this.markUnhealthy();
        }
        // fallthrough to AsyncStorage
      }
    }

    // AsyncStorage write: wrap to ensure we don't let disk-full or other errors bubble up
    try {
      await AsyncStorage.setItem(key, toStore);
    } catch (e: any) {
      const msg = String(e?.message || e || '').toLowerCase();
      console.warn('AsyncStorage.setItem failed in MMKVStorageService.setItem:', e);
      if (msg.includes('sqlite_full') || msg.includes('database or disk is full') || msg.includes('enospc')) {
        // mark MMKV as unhealthy (so higher layers can back off) and swallow the error
        try { this.markUnhealthy(); } catch (_) {}
        // Attempt a best-effort eviction to free space
        try { await this.evictLeastRecentlyUsed(1024 * 1024); } catch (_) {}
      }
      // Swallow the error - higher-level services treat cache writes as best-effort
      return;
    }
  }

  // Compatibility: canonical API expected by StorageOrchestrator
  public async initialize(): Promise<void> {
    // MMKV has minimal initialization; nothing to do here
    return Promise.resolve();
  }

  public async shutdown(): Promise<void> {
    // No-op for MMKV; in future could flush caches
    return Promise.resolve();
  }

  public async getStorageSize(): Promise<number> {
    // Best-effort size estimate of all keys
    try {
      const keys = await this.getAllKeys();
      const size = await this.estimateSizeForKeys(keys);
      return size;
    } catch (e) {
      return 0;
    }
  }

  public async getCacheSize(): Promise<number> {
    // For MMKV hot cache, cache size is the same as storage size
    return this.getStorageSize();
  }

  public async getTotalSize(): Promise<number> {
    // Total size includes storage and any overhead
    return this.getStorageSize();
  }

  public async getLastCleanupTime(): Promise<Date> {
    // MMKV doesn't track cleanup time; return a default date
    return new Date(0); // Epoch time as placeholder
  }

  // Provide a query API to satisfy orchestrator calls; returns empty by default
  public async query(_collection: string, _filters?: any): Promise<any[]> {
    return [];
  }

  public async syncToCloud(): Promise<void> {
    // MMKV is local-only; nothing to sync
    return Promise.resolve();
  }

  public async optimizeStorage(): Promise<void> {
    // No-op: placeholder for future compaction
    return Promise.resolve();
  }

  /**
   * Evict least-recent keys up to maxBytes to free space.
   * This is a best-effort operation and may be a no-op on some platforms.
   */
  public async evictLeastRecentlyUsed(maxBytes: number = 1024 * 1024): Promise<number> {
    try {
      // Prefer reading hot-index if present to avoid scanning unrelated keys
      const indexKey = '@neurolearn/hot_index';
      let keys: string[] = [];
      try {
        const idxRaw = await this.getItem(indexKey);
        if (idxRaw) {
          const parsed = JSON.parse(idxRaw);
          if (Array.isArray(parsed)) keys = parsed;
        }
      } catch (e) {
        // fallback to getAllKeys
        keys = await this.getAllKeys();
      }

      // Build key->ts pairs by reading each item metadata (best-effort)
      const pairs: Array<{ key: string; ts: number; size: number }> = [];
      for (const k of keys) {
        try {
          const v = await this.getItem(k);
          if (!v) continue;
          let ts = Date.now();
          try {
            const parsed = JSON.parse(v);
            ts = parsed?.timestamp || parsed?.created_at || parsed?.createdAt || ts;
          } catch (e) {
            // if not JSON, keep now
          }
          pairs.push({ key: k, ts, size: v.length * 2 });
        } catch (e) {
          // ignore per-key errors
        }
      }

      // Sort by timestamp ascending (oldest first)
      pairs.sort((a,b) => a.ts - b.ts);

      let freed = 0;
      for (const p of pairs) {
        try {
          // removeItem is defensive; swallow any errors to continue eviction
          try { await this.removeItem(p.key); } catch (_) {}
          freed += p.size || 0;
          if (freed >= maxBytes) break;
        } catch (e) {
          // ignore
        }
      }

      return freed;
    } catch (e) {
      console.warn('MMKV evict failed:', e);
      return 0;
    }
  }

  /**
   * Heuristic: detect low-device storage. Placeholder — platform APIs recommended.
   */
  public async isSpaceLow(thresholdBytes: number = 5 * 1024 * 1024): Promise<boolean> {
    try {
      // Best-effort: estimate our cache size and compare against threshold
      const size = await this.getStorageSize();
      return size > thresholdBytes;
    } catch (e) {
      return false;
    }
  }

  public async saveSessionProgress(_data: any): Promise<void> {
    // MMKV acts as hot cache; orchestrator will persist elsewhere
    return Promise.resolve();
  }

  public async saveUserProgress(_data: any): Promise<void> {
    return Promise.resolve();
  }

  public async getItem(key: string): Promise<string | null> {
    if (this.mmkv) {
      try {
        const val = this.mmkv.getString(key);
        // MMKV returns undefined when missing in some builds
        return val === undefined ? null : val;
      } catch (e) {
        console.warn('MMKV get failed, falling back to AsyncStorage:', e);
      }
    }

    try {
      const v = await AsyncStorage.getItem(key);
      return v;
    } catch (e) {
      console.warn('AsyncStorage.getItem failed in MMKVStorageService.getItem:', e);
      return null;
    }
  }

  public async removeItem(key: string): Promise<void> {
    if (this.mmkv) {
      try {
        this.mmkv.delete(key);
        return;
      } catch (e) {
        console.warn('MMKV delete failed, falling back to AsyncStorage:', e);
      }
    }

    try {
      await AsyncStorage.removeItem(key);
    } catch (e) {
      console.warn('AsyncStorage.removeItem failed in MMKVStorageService.removeItem:', e);
      // swallow - best-effort
    }
  }

  /**
   * Return all known keys. When using MMKV, try to call its getAllKeys API.
   * When unavailable, fall back to scanning AsyncStorage keys.
   */
  public async getAllKeys(): Promise<string[]> {
    if (this.mmkv && typeof this.mmkv.getAllKeys === 'function') {
      try {
        return (this.mmkv.getAllKeys && this.mmkv.getAllKeys()) || [];
      } catch (e) {
        console.warn('MMKV getAllKeys failed, falling back to AsyncStorage:', e);
      }
    }

    try {
      const keys = await AsyncStorage.getAllKeys();
      // AsyncStorage.getAllKeys may return a readonly array type; normalize to mutable array
      return Array.isArray(keys) ? Array.from(keys) : [];
    } catch (e) {
      console.error('Failed to read AsyncStorage keys:', e);
      return [];
    }
  }

  /**
   * Convenience: get keys that start with a prefix
   */
  public async getKeysWithPrefix(prefix: string): Promise<string[]> {
    const keys = await this.getAllKeys();
    return keys.filter(k => k.startsWith(prefix));
  }

  /**
   * Estimate the size (in bytes) of stored values for the provided keys. This is
   * a best-effort estimate using string lengths and will not be exact.
   */
  public async estimateSizeForKeys(keys: string[]): Promise<number> {
    let size = 0;
    for (const k of keys) {
      const v = await this.getItem(k);
      if (v) size += v.length * 2; // rough estimate: 2 bytes per char
    }
    return size;
  }

  /**
   * Convenience: store a JSON-serializable object under a key.
   */
  public async setObject(key: string, obj: any): Promise<void> {
    try {
      const s = JSON.stringify(obj);
      await this.setItem(key, s);
    } catch (e) {
      const msg = String((e as any)?.message || e);
      console.warn('MMKV setObject failed:', e);
      if (msg.includes('SQLITE_FULL') || msg.toLowerCase().includes('database or disk is full')) {
        // Mark unhealthy for a short cooldown so higher layers can back off
        this.markUnhealthy();
      }
      try {
        await this.setItem(key, '{}');
      } catch (inner) {
        // ignore - best-effort
      }
    }
  }

  /**
   * Convenience: read and parse a JSON object stored under key.
   */
  public async getObject<T = any>(key: string): Promise<T | null> {
    const raw = await this.getItem(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch (e) {
      console.warn('MMKV getObject parse failed for key', key, e);
      return null;
    }
  }

  /**
   * Check whether a key exists in the underlying storage.
   */
  public async hasKey(key: string): Promise<boolean> {
    if (this.mmkv && typeof (this.mmkv as any).getString === 'function') {
      try {
        const v = (this.mmkv as any).getString(key);
        return v !== undefined && v !== null;
      } catch (e) {
        // fallthrough
      }
    }

    try {
      const v = await AsyncStorage.getItem(key);
      return v !== null && v !== undefined;
    } catch (e) {
      return false;
    }
  }
}

export default MMKVStorageService.getInstance();
