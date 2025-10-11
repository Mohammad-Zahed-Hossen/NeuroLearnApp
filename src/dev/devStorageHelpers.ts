import HybridStorageService from '../services/storage/HybridStorageService';
import syncQueue from '../services/storage/syncQueue';

export async function performCleanup() {
  try {
    const hs: any = HybridStorageService;
    return await hs.performStorageCleanup();
  } catch (e) {
    console.error('performCleanup failed', e);
    throw e;
  }
}

export async function clearLegacyQueue() {
  try {
    await syncQueue.clearLegacyQueue();
  } catch (e) {
    console.error('clearLegacyQueue failed', e);
    throw e;
  }
}

if (typeof __DEV__ !== 'undefined' && __DEV__) {
  // expose for debug console in dev
  try {
    (global as any).performStorageCleanup = performCleanup;
    (global as any).clearLegacyQueue = clearLegacyQueue;
  } catch (e) {}
}
