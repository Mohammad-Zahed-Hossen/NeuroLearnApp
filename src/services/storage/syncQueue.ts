import AsyncStorage from '@react-native-async-storage/async-storage';
import StorageService from './StorageService';
import database from '../../database/database';

type LegacyItem = {
  key: string;
  data: any;
  timestamp: number;
  attempts?: number;
};

type DbItem = {
  record: any; // WatermelonDB record or fallback wrapped record
  key: string;
  data: any;
  id?: string;
};

const LEGACY_KEY = '@neurolearn/sync_queue';

const syncQueue = {
  // Enqueue in warm DB (best-effort) and in legacy AsyncStorage
  async enqueue(key: string, data: any): Promise<void> {
    // Try warm DB first
    try {
      const col = database.collections.get('sync_queue');
      await database.write(async () => {
        await col.create((r: any) => {
          r.key = key;
          r.data = data;
          r.timestamp = Date.now();
          r.attempts = 0;
          r.created_at = Date.now();
        });
      });
    } catch (err) {
      // ignore - fallback will persist in AsyncStorage
    }

    // Legacy AsyncStorage queue
    try {
      let raw: string | null = null;
      try {
        raw = await StorageService.getInstance().getItem(LEGACY_KEY);
      } catch (e) {
        // fallback
        raw = await AsyncStorage.getItem(LEGACY_KEY);
      }
      let queue: LegacyItem[] = [];
      try {
        queue = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(queue)) queue = [];
      } catch (parseErr) {
        queue = [];
      }
      queue.push({ key, data, timestamp: Date.now(), attempts: 0 });
      try {
        try {
          await StorageService.getInstance().setItem(LEGACY_KEY, JSON.stringify(queue));
        } catch (e) {
          await AsyncStorage.setItem(LEGACY_KEY, JSON.stringify(queue));
        }
      } catch (writeErr) {
        // If device is out of space, attempt to trim the queue to last N items and retry
        const msg = String((writeErr as any)?.message || writeErr || '');
        console.warn('Failed to enqueue legacy sync item to AsyncStorage:', writeErr);
        if (msg.includes('SQLITE_FULL') || msg.toLowerCase().includes('database or disk is full')) {
          const MAX_LEGACY_QUEUE = 20;
          try {
            const trimmed = queue.slice(-MAX_LEGACY_QUEUE);
            try {
              await StorageService.getInstance().setItem(LEGACY_KEY, JSON.stringify(trimmed));
            } catch (retryErr) {
              await AsyncStorage.setItem(LEGACY_KEY, JSON.stringify(trimmed));
            }
          } catch (retryErr) {
            console.error('Retry writing trimmed legacy queue failed:', retryErr);
          }
        }
      }
    } catch (err) {
      console.error('Failed to enqueue legacy sync item (unexpected):', err);
    }
  },

  // Fetch items from warm DB and legacy AsyncStorage
  async fetchAll(): Promise<{ dbItems: DbItem[]; legacyItems: LegacyItem[] }> {
    const dbItems: DbItem[] = [];
    const legacyItems: LegacyItem[] = [];

    // DB items
    try {
      const col = database.collections.get('sync_queue');
      const items = await col.query().fetch();
      for (const rec of items) {
        const raw = (rec && rec._raw) ? rec._raw : rec;
        const key = raw?.key ?? null;
        const data = raw?.data ?? null;
        const id = raw?.id ?? raw?._id ?? undefined;
        dbItems.push({ record: rec, key, data, id });
      }
    } catch (err) {
      // ignore
    }

    // Legacy AsyncStorage
    try {
      let raw: string | null = null;
      try {
        raw = await StorageService.getInstance().getItem(LEGACY_KEY);
      } catch (e) {
        raw = await AsyncStorage.getItem(LEGACY_KEY);
      }
      const queue: LegacyItem[] = raw ? JSON.parse(raw as string) : [];
      legacyItems.push(...queue);
    } catch (err) {
      // ignore
    }

    return { dbItems, legacyItems };
  },

  // Remove DB record (best-effort)
  async removeDbRecord(rec: any): Promise<void> {
    try {
      if (typeof rec.markAsDeleted === 'function') {
        await rec.markAsDeleted();
        return;
      }

      const raw = rec._raw ?? rec;
      if (raw && raw.id) {
        const col = database.collections.get('sync_queue');
        if (typeof (col as any).markAsDeletedById === 'function') {
          await (col as any).markAsDeletedById(raw.id);
          return;
        }
        if (typeof (col as any).updateById === 'function') {
          await (col as any).updateById(raw.id, (r: any) => { r.deleted = true; });
          return;
        }
      }
    } catch (err) {
      // ignore
    }
  },

  // Persist remaining legacy queue array
  async persistLegacyQueue(queue: LegacyItem[]): Promise<void> {
    try {
      try {
        await StorageService.getInstance().setItem(LEGACY_KEY, JSON.stringify(queue));
      } catch (e) {
        await AsyncStorage.setItem(LEGACY_KEY, JSON.stringify(queue));
      }
    } catch (err) {
      console.warn('Failed to persist legacy sync queue:', err);
    }
  },

  // Clear all queue entries (DB + AsyncStorage)
  async clearAll(): Promise<void> {
    try {
      // Clear DB
      try {
        const col = database.collections.get('sync_queue');
        const items = await col.query().fetch();
        for (const rec of items) {
          try {
            if (typeof rec.markAsDeleted === 'function') await rec.markAsDeleted();
            else if (rec._raw && rec._raw.id && typeof (col as any).markAsDeletedById === 'function') {
              await (col as any).markAsDeletedById(rec._raw.id);
            }
          } catch (e) {
            // ignore
          }
        }
      } catch (e) {
        // ignore
      }

      // Clear legacy AsyncStorage
      try {
        await StorageService.getInstance().removeItem(LEGACY_KEY);
      } catch (e) {
        await AsyncStorage.removeItem(LEGACY_KEY);
      }
    } catch (err) {
      console.warn('Failed to clear sync queue:', err);
    }
  },

  // Dev helper: clear only the legacy AsyncStorage queue (useful when device storage is constrained)
  async clearLegacyQueue(): Promise<void> {
    try {
      try {
        await StorageService.getInstance().removeItem(LEGACY_KEY);
        console.log('Legacy sync queue cleared');
      } catch (e) {
        await AsyncStorage.removeItem(LEGACY_KEY);
        console.log('Legacy sync queue cleared');
      }
    } catch (err) {
      console.warn('Failed to clear legacy queue:', err);
    }
  },

  // Increment attempts for a legacy item and return updated item
  incrementLegacyAttempt(item: LegacyItem): LegacyItem {
    item.attempts = (item.attempts || 0) + 1;
    return item;
  },

  // Try to update attempts count for a DB record
  async incrementDbAttempt(rec: any): Promise<void> {
    try {
      if (rec.update) {
        await rec.update((r: any) => { r.attempts = ((r.attempts || 0) + 1); });
        return;
      }
      const raw = rec._raw ?? rec;
      if (raw && raw.id) {
        const col = database.collections.get('sync_queue');
        if (typeof (col as any).updateById === 'function') {
          await (col as any).updateById(raw.id, (r: any) => { r.attempts = ((r.attempts || 0) + 1); });
        }
      }
    } catch (err) {
      // ignore
    }
  }
};

export default syncQueue;
