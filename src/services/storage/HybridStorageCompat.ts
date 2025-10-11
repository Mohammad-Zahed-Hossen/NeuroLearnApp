import HybridStorageService from './HybridStorageService';

const svc: any = (HybridStorageService as any) || {};

const HybridStorageCompat: any = {
  getInstance() {
    return svc;
  },
  async initialize() {
    if (typeof svc.checkConnectivity === 'function') return svc.checkConnectivity();
    return Promise.resolve();
  },
  async shutdown() {
    if (typeof svc.shutdown === 'function') return svc.shutdown();
    return Promise.resolve();
  },
  async optimizeStorage() {
    if (typeof svc.performStorageCleanup === 'function') return svc.performStorageCleanup();
    return Promise.resolve();
  },
  async saveSessionProgress(session: any) {
    if (typeof svc.saveStudySession === 'function') return svc.saveStudySession(session);
    if (typeof svc.saveStudySessions === 'function') return svc.saveStudySessions([session]);
    if (typeof svc.saveUserProgress === 'function') return svc.saveUserProgress(session.userId || 'unknown', session.progress || {});
    return Promise.resolve();
  },
  async saveUserProgress(userId: string, progress: any) {
    if (typeof svc.saveUserProgress === 'function') return svc.saveUserProgress(userId, progress);
    return Promise.resolve();
  },
  async getStorageSize() {
    if (typeof svc.getStorageInfo === 'function') {
      try {
        const info = await svc.getStorageInfo();
        return info.cacheSize || 0;
      } catch (e) { return 0; }
    }
    return Promise.resolve(0);
  },
  async syncToCloud() {
    if (typeof svc.backgroundSync === 'function') return svc.backgroundSync();
    if (typeof svc.backgroundSync === 'function') return svc.backgroundSync();
    return Promise.resolve({ synced: 0, failed: 0 });
  },
  async query(collection: string, filters?: any) {
    if (typeof svc.getItem === 'function' && !filters) return svc.getItem(collection);
    if (typeof svc.getContextSnapshots === 'function' && collection === 'context_snapshots') return svc.getContextSnapshots(filters?.startDate, filters?.endDate, filters?.limit);
    if (typeof svc.getTasks === 'function' && collection === 'tasks') return svc.getTasks();
    return Promise.resolve([]);
  },
  async removeItem(key: string) {
    if (typeof svc.removeItem === 'function') return svc.removeItem(key);
    return Promise.resolve();
  },
  async getItem(key: string) {
    if (typeof svc.getItem === 'function') return svc.getItem(key);
    return Promise.resolve(null);
  },
  async setItem(key: string, value: any) {
    if (typeof svc.setItem === 'function') return svc.setItem(key, value);
    return Promise.resolve();
  },
  async clearNonEssential() {
    if (typeof svc.performStorageCleanup === 'function') return svc.performStorageCleanup();
    return Promise.resolve();
  }
};

export default HybridStorageCompat;
