import MMKVStorageService from './MMKVStorageService';

const svc: any = (MMKVStorageService as any) || {};

const MMKVStorageCompat = {
  getInstance() {
    return svc;
  },
  async initialize() {
    if (typeof svc.initialize === 'function') return svc.initialize();
    return Promise.resolve();
  },
  async shutdown() {
    if (typeof svc.shutdown === 'function') return svc.shutdown();
    return Promise.resolve();
  },
  async clearNonEssential() {
    try {
      if (typeof svc.getAllKeys === 'function') {
        const keys: string[] = await svc.getAllKeys();
        // Keep essential keys - simple heuristic
        const essentialPrefixes = ['ctx:', '@neurolearn/cache_context_snapshots', '@neurolearn/cache_context_snapshot'];
        const toRemove = keys.filter(k => !essentialPrefixes.some(p => k.startsWith(p)));
        await Promise.all(toRemove.map(k => (typeof svc.removeItem === 'function' ? svc.removeItem(k) : Promise.resolve())));
      }
    } catch (e) {
      // best-effort
      try { if (typeof svc.markUnhealthy === 'function') (svc as any).markUnhealthy(); } catch (_) {}
    }
  },
  // Proxy other common methods
  async setItem(key: string, value: any) {
    if (typeof svc.setItem === 'function') return svc.setItem(key, value);
    if (typeof svc.setObject === 'function') return svc.setObject(key, value);
    return Promise.resolve();
  },
  async getItem(key: string) {
    if (typeof svc.getItem === 'function') return svc.getItem(key);
    if (typeof svc.getObject === 'function') return svc.getObject(key);
    return null;
  },
  async removeItem(key: string) {
    if (typeof svc.removeItem === 'function') return svc.removeItem(key);
    if (typeof svc.delete === 'function') return svc.delete(key);
    return Promise.resolve();
  },
  async getAllKeys() {
    if (typeof svc.getAllKeys === 'function') return svc.getAllKeys();
    return [];
  },
  async getStorageSize() {
    if (typeof svc.getStorageSize === 'function') return svc.getStorageSize();
    if (typeof svc.estimateSizeForKeys === 'function' && typeof svc.getAllKeys === 'function') {
      try {
        const keys = await svc.getAllKeys();
        return await svc.estimateSizeForKeys(keys);
      } catch (e) { return 0; }
    }
    return 0;
  },
  async getKeysWithPrefix(prefix: string) {
    if (typeof svc.getKeysWithPrefix === 'function') return svc.getKeysWithPrefix(prefix);
    if (typeof svc.getAllKeys === 'function') {
      const keys: string[] = await svc.getAllKeys();
      return keys.filter(k => k.startsWith(prefix));
    }
    return [];
  }
};

export default MMKVStorageCompat;
