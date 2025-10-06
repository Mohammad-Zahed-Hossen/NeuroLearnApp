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

  private constructor() {
    // Try to require MMKV dynamically so the import won't crash if the package
    // isn't installed yet. If it's not available, we'll fall back to AsyncStorage.
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
      const { MMKV } = require('react-native-mmkv');
      // Create a default instance with a safe id (no encryption by default)
      // Consumers may override with their own instance if needed.
      // NOTE: native installation is required for production use.
      // We only keep the minimal API surface we need.
      // eslint-disable-next-line new-cap
      const store = new MMKV({ id: 'neurolearn-hot-cache' }) as any;
      this.mmkv = store as MaybeMMKV;
      this.isUsingMMKV = true;
    } catch (err) {
      // MMKV not available - will use AsyncStorage fallback
      this.mmkv = null;
      this.isUsingMMKV = false;
    }
  }

  public static getInstance(): MMKVStorageService {
    if (!MMKVStorageService.instance) {
      MMKVStorageService.instance = new MMKVStorageService();
    }
    return MMKVStorageService.instance;
  }

  public isAvailable(): boolean {
    return this.isUsingMMKV && this.mmkv !== null;
  }

  public async setItem(key: string, value: string): Promise<void> {
    if (this.mmkv) {
      try {
        this.mmkv.set(key, value);
        return;
      } catch (e) {
        // fallthrough to AsyncStorage
        console.warn('MMKV set failed, falling back to AsyncStorage:', e);
      }
    }

    await AsyncStorage.setItem(key, value);
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

    const v = await AsyncStorage.getItem(key);
    return v;
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

    await AsyncStorage.removeItem(key);
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
}

export default MMKVStorageService.getInstance();
