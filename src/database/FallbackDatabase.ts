import AsyncStorage from '@react-native-async-storage/async-storage';
import { QClause } from './Q';

// Very small fallback DB: stores collections as JSON arrays in AsyncStorage under key `db:{collection}`
class FallbackCollection<T extends { id?: string | undefined }> {
  constructor(private name: string) {}

  private storageKey() {
    return `db:${this.name}`;
  }

  private async readAllRaw(): Promise<T[]> {
    const raw = await AsyncStorage.getItem(this.storageKey());
    if (!raw) return [];
    try {
      return JSON.parse(raw) as T[];
    } catch {
      return [];
    }
  }

  private async writeAll(items: T[]): Promise<void> {
    await AsyncStorage.setItem(this.storageKey(), JSON.stringify(items));
  }

  // Lightweight wrapper that mimics WatermelonDB model methods where possible
  private wrapRecord(raw: T) {
    const col = this;
    const record: any = { ...raw };
    record.markAsDeleted = async () => {
      await col.markAsDeletedById(record.id);
    };
    record.update = async (updater: (r: any) => void) => {
      updater(record);
      await col.updateById(record.id, (r: any) => Object.assign(r, record));
    };
    return record as T & { markAsDeleted: () => Promise<void>; update: (fn: (r: any) => void) => Promise<void> };
  }

  async create(make: (record: T) => void): Promise<any> {
    const items = await this.readAllRaw();
    const record = {} as T;
    make(record);
    if (!record.id) record.id = `local_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
    items.push(record);
    await this.writeAll(items);
    return this.wrapRecord(record);
  }

  query(...clauses: QClause[]) {
    // Return a query-like object synchronously. The actual work is done in the
    // async fetch()/fetchCount() methods which read storage at call-time.
    const self = this;
    return {
      fetch: async () => {
        let items = await self.readAllRaw();

        // Apply simple where clauses
        for (const c of clauses) {
          if ((c as any).type === 'where') {
            const { field, predicate } = c as any;
            if ((predicate as any).op === 'gte') {
              items = items.filter(i => (i as any)[field] >= (predicate as any).value);
            } else if ((predicate as any).op === 'lt') {
              items = items.filter(i => (i as any)[field] < (predicate as any).value);
            } else if ((predicate as any).op === 'oneOf') {
              items = items.filter(i => (predicate as any).arr.includes((i as any)[field]));
            }
          }
        }

        // Sort
        for (const c of clauses) {
          if ((c as any).type === 'sortBy') {
            const { field, order } = c as any;
            items = items.sort((a, b) => {
              const av = (a as any)[field];
              const bv = (b as any)[field];
              if (av === bv) return 0;
              if (order === 'asc') return av < bv ? -1 : 1;
              return av > bv ? -1 : 1;
            });
          }
        }

        // Take
        for (const c of clauses) {
          if ((c as any).type === 'take') {
            items = items.slice(0, (c as any).n);
          }
        }

        return items.map(i => self.wrapRecord(i));
      },
      fetchCount: async () => {
        const items = await self.readAllRaw();
        return items.length;
      }
    };
  }

  async fetchCount(): Promise<number> {
    const items = await this.readAllRaw();
    return items.length;
  }

  // Mark as deleted: remove by id
  async markAsDeletedById(id: string): Promise<void> {
    const items = await this.readAllRaw();
    const filtered = items.filter(i => (i as any).id !== id);
    await this.writeAll(filtered);
  }

  // update items matching predicate function
  async updateById(id: string, updateFn: (item: T) => void): Promise<void> {
    const items = await this.readAllRaw();
    const idx = items.findIndex(i => (i as any).id === id);
    if (idx === -1) return;
    updateFn(items[idx]);
    await this.writeAll(items);
  }
}

class FallbackDatabase {
  private collections = new Map<string, FallbackCollection<any>>();

  public collectionsGet<T extends { id?: string | undefined }>(name: string): FallbackCollection<T> {
    if (!this.collections.has(name)) {
      this.collections.set(name, new FallbackCollection(name));
    }
    return this.collections.get(name) as FallbackCollection<T>;
  }

  // Provide minimal write wrapper like WatermelonDB
  public async write(fn: () => Promise<void>): Promise<void> {
    // no-op lock for simple AsyncStorage fallback
    await fn();
  }
}

export default new FallbackDatabase();
