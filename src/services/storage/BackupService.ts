import AsyncStorage from '@react-native-async-storage/async-storage';
import { compressString, decompressToString } from '../../core/utils/compression';
import HybridStorageService from './HybridStorageService';

const BACKUP_KEY_PREFIX = '@neurolearn/backup_';

export default class BackupService {
  public static async createLocalBackup(name: string = 'manual'): Promise<string | null> {
    try {
      const service = HybridStorageService.getInstance();
      // Gather minimal export
      const payload = await service.exportAllData();
      const compressed = await compressString(payload);
      const timestamp = Date.now();
      const key = `${BACKUP_KEY_PREFIX}${name}_${timestamp}`;
      const toStore = typeof compressed === 'string' ? compressed : Buffer.from(compressed).toString('base64');
      await AsyncStorage.setItem(key, JSON.stringify({ key, compressed: true, ts: timestamp, data: toStore }));
      // Rotate old backups (keep last 7)
      await BackupService.rotateBackups(7);
      return key;
    } catch (e) {
      console.warn('createLocalBackup failed:', e);
      return null;
    }
  }

  public static async listBackups(): Promise<any[]> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const backupKeys = keys.filter(k => k.startsWith(BACKUP_KEY_PREFIX));
      const items = await Promise.all(backupKeys.map(k => AsyncStorage.getItem(k)));
      return items.map(i => i ? JSON.parse(i) : null).filter(Boolean);
    } catch (e) {
      return [];
    }
  }

  private static async rotateBackups(keep: number) {
    try {
      const list = await BackupService.listBackups();
      if (list.length <= keep) return;
      // Sort by ts ascending and remove oldest
      list.sort((a: any, b: any) => a.ts - b.ts);
      const toRemove = list.slice(0, list.length - keep);
      for (const r of toRemove) {
        try { await AsyncStorage.removeItem(r.key); } catch (e) {}
      }
    } catch (e) {
      // ignore
    }
  }

  public static async restoreBackup(key: string): Promise<boolean> {
    try {
      const raw = await AsyncStorage.getItem(key);
      if (!raw) return false;
      const obj = JSON.parse(raw);
      const dataStr = obj.compressed ? await decompressToString(Buffer.from(obj.data, 'base64')) : obj.data;
      // For safety, don't auto-apply; return the JSON payload string for manual inspection
      // If required, a method to apply can be added which would call HybridStorageService.clearAllData and then restore
      (global as any).__latestBackupString = dataStr;
      return true;
    } catch (e) {
      console.warn('restoreBackup failed:', e);
      return false;
    }
  }
}
