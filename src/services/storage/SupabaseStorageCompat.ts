/**
 * SupabaseStorage compatibility shim
 * Expose legacy method names expected by adapters and forward to canonical SupabaseStorageService
 */
import SupabaseStorageService from './SupabaseStorageService';

const svcAny: any = (SupabaseStorageService as any).default || SupabaseStorageService;

const SupabaseStorageCompat: any = {
  async initialize() {
    if (typeof svcAny.initialize === 'function') return svcAny.initialize();
    return Promise.resolve();
  },
  async shutdown() {
    if (typeof svcAny.shutdown === 'function') return svcAny.shutdown();
    return Promise.resolve();
  },
  async upsert(table: string, payload: any) {
    if (typeof svcAny.upsert === 'function') return svcAny.upsert(table, payload);
    if (typeof svcAny.insert === 'function') return svcAny.insert(table, payload);
    return Promise.resolve({ data: payload, error: null });
  },
  async insert(table: string, payload: any) {
    if (typeof svcAny.insert === 'function') return svcAny.insert(table, payload);
    if (typeof svcAny.upsert === 'function') return svcAny.upsert(table, payload);
    return Promise.resolve({ data: payload, error: null });
  },
  async update(table: string, payload: any, filter?: any) {
    if (typeof svcAny.update === 'function') return svcAny.update(table, payload, filter);
    return Promise.resolve({ data: payload, error: null });
  },
  async delete(table: string, filter?: any) {
    if (typeof svcAny.delete === 'function') return svcAny.delete(table, filter);
    return Promise.resolve({ data: [], error: null });
  },
  async query(...args: any[]) {
    if (typeof svcAny.query === 'function') return svcAny.query(...args);
    if (typeof svcAny.from === 'function') return svcAny.from(...args);
    return Promise.resolve({ data: [], error: null });
  },
  subscribeToChanges(...args: any[]) {
    if (typeof svcAny.subscribeToChanges === 'function') return svcAny.subscribeToChanges(...args);
    if (typeof svcAny.on === 'function') return svcAny.on(...args);
    return null;
  },
  unsubscribeFromChanges(...args: any[]) {
    if (typeof svcAny.unsubscribeFromChanges === 'function') return svcAny.unsubscribeFromChanges(...args);
    if (typeof svcAny.off === 'function') return svcAny.off(...args);
    return null;
  },
  async callFunction(name: string, params?: any) {
    if (svcAny && svcAny.functions && typeof svcAny.functions.invoke === 'function') return svcAny.functions.invoke(name, params);
    if (typeof svcAny.callFunction === 'function') return svcAny.callFunction(name, params);
    return Promise.resolve({ data: null, error: null });
  },
  async reconnect() {
    if (typeof svcAny.reconnect === 'function') return svcAny.reconnect();
    return Promise.resolve();
  },
  async getStorageSize() {
    if (typeof svcAny.getStorageSize === 'function') return svcAny.getStorageSize();
    return Promise.resolve(0);
  },
  async saveSessionProgress(session: any) {
    if (typeof svcAny.saveSessionProgress === 'function') return svcAny.saveSessionProgress(session);
    if (typeof svcAny.saveUserProgress === 'function') return svcAny.saveUserProgress(session.userId, session.progress || {});
    return Promise.resolve();
  },
  async saveUserProgress(userId: string, progress: any) {
    if (typeof svcAny.saveUserProgress === 'function') return svcAny.saveUserProgress(userId, progress);
    return Promise.resolve();
  },
  async removeItem(key: string) {
    if (typeof svcAny.removeItem === 'function') return svcAny.removeItem(key);
    return Promise.resolve();
  }
};

export default SupabaseStorageCompat;
