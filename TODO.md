# 🚀 Complete Hybrid Architecture for CAE 2.0 (Production-Ready)

Perfect! Since you're starting fresh, I'll design the **ultimate architecture** from day one - no migration baggage, just modern best practices.

## 🎯 Architecture Overview

```
┌────────────────────────────────────────────────────┐
│                   UI Layer                          │
│  React Native + TypeScript + Zustand (state mgmt)  │
└─────────────────────┬──────────────────────────────┘
                      │
┌─────────────────────▼──────────────────────────────┐
│              Service Layer (Business Logic)         │
│  • ContextSensorService  • CognitiveAuraService    │
│  • PatternDetectionService  • InsightsService      │
└─────────────────────┬──────────────────────────────┘
                      │
┌─────────────────────▼──────────────────────────────┐
│           Hybrid Storage Manager                    │
│  ┌──────────────┐  ┌──────────────┐               │
│  │ MMKV (Hot)   │  │ WatermelonDB │               │
│  │ 0-48h        │  │ (Warm)       │               │
│  │ Ultra-fast   │  │ 2-30 days    │               │
│  │ 10MB max     │  │ Queryable    │               │
│  └──────┬───────┘  └──────┬───────┘               │
│         │                  │                        │
│         └────────┬─────────┘                        │
│                  │                                  │
│         ┌────────▼─────────┐                       │
│         │   Sync Engine    │                       │
│         │  Smart batching  │                       │
│         │  Conflict res.   │                       │
│         └────────┬─────────┘                       │
└──────────────────┼──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│              Supabase Cloud                          │
│  • Postgres (Cold storage, 30+ days)                │
│  • Edge Functions (aggregation, ML processing)      │
│  • Realtime (multi-device sync - future)            │
│  • Storage (compressed archives)                    │
└─────────────────────────────────────────────────────┘
```

## 📦 Installation

```bash
# Core storage
npm install react-native-mmkv @nozbe/watermelondb @nozbe/with-observables
npm install @supabase/supabase-js

# State management
npm install zustand

# Utilities
npm install date-fns uuid react-native-netinfo
npm install pako # For compression

# Dev dependencies
npm install --save-dev @types/pako
```

## 🗄️ Complete Storage Implementation

### 1. **Storage Configuration**

```typescript
// config/storage.config.ts
export const STORAGE_CONFIG = {
  // MMKV Hot Tier (Ultra-fast, recent data)
  hot: {
    maxSize: 10 * 1024 * 1024, // 10MB
    retention: 48 * 60 * 60 * 1000, // 48 hours
    checkInterval: 30 * 60 * 1000, // Check every 30 min
  },

  // WatermelonDB Warm Tier (Queryable, medium-term)
  warm: {
    maxRecords: 10000, // ~20MB for typical context data
    retention: 30 * 24 * 60 * 60 * 1000, // 30 days
    syncInterval: 15 * 60 * 1000, // Sync every 15 min
  },

  // Supabase Cold Tier (Cloud backup, long-term)
  cold: {
    batchSize: 50, // Upload 50 records at once
    compression: true,
    retryAttempts: 3,
    retryDelay: 5000, // 5 seconds
  },

  // Context monitoring
  monitoring: {
    baseInterval: 5 * 60 * 1000, // 5 minutes
    adaptiveScaling: true,
    pauseWhenIdle: true,
    significantChangeThreshold: 0.15, // 15% change
  },
} as const;
```

### 2. **WatermelonDB Schema**

```typescript
// database/schema.ts
import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 1,
  tables: [
    // Context snapshots
    tableSchema({
      name: 'context_snapshots',
      columns: [
        { name: 'timestamp', type: 'number', isIndexed: true },
        { name: 'focus_level', type: 'number' },
        { name: 'energy_level', type: 'number' },
        { name: 'mood_state', type: 'string' },
        { name: 'activity_pattern', type: 'string' },
        { name: 'context_hash', type: 'string' }, // For deduplication
        { name: 'synced', type: 'boolean', isIndexed: true },
        { name: 'synced_at', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number' },
      ],
    }),

    // Sync queue (tracks what needs to be uploaded)
    tableSchema({
      name: 'sync_queue',
      columns: [
        { name: 'operation', type: 'string' }, // insert, update, delete
        { name: 'table_name', type: 'string' },
        { name: 'record_id', type: 'string' },
        { name: 'payload', type: 'string' }, // JSON string
        { name: 'attempts', type: 'number' },
        { name: 'last_attempt', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number', isIndexed: true },
      ],
    }),

    // Aggregated insights (pre-computed for speed)
    tableSchema({
      name: 'daily_insights',
      columns: [
        { name: 'date', type: 'string', isIndexed: true }, // YYYY-MM-DD
        { name: 'avg_focus', type: 'number' },
        { name: 'avg_energy', type: 'number' },
        { name: 'peak_hours', type: 'string' }, // JSON array
        { name: 'total_contexts', type: 'number' },
        { name: 'patterns', type: 'string' }, // JSON object
        { name: 'created_at', type: 'number' },
      ],
    }),
  ],
});
```

### 3. **WatermelonDB Models**

```typescript
// database/models/ContextSnapshot.ts
import { Model } from '@nozbe/watermelondb';
import { field, readonly, date } from '@nozbe/watermelondb/decorators';

export class ContextSnapshot extends Model {
  static table = 'context_snapshots';

  @field('timestamp') timestamp!: number;
  @field('focus_level') focusLevel!: number;
  @field('energy_level') energyLevel!: number;
  @field('mood_state') moodState!: string;
  @field('activity_pattern') activityPattern!: string;
  @field('context_hash') contextHash!: string;
  @field('synced') synced!: boolean;
  @field('synced_at') syncedAt?: number;
  @readonly @date('created_at') createdAt!: Date;
}

// database/models/SyncQueue.ts
export class SyncQueueItem extends Model {
  static table = 'sync_queue';

  @field('operation') operation!: 'insert' | 'update' | 'delete';
  @field('table_name') tableName!: string;
  @field('record_id') recordId!: string;
  @field('payload') payload!: string;
  @field('attempts') attempts!: number;
  @field('last_attempt') lastAttempt?: number;
  @readonly @date('created_at') createdAt!: Date;
}

// database/models/DailyInsight.ts
export class DailyInsight extends Model {
  static table = 'daily_insights';

  @field('date') date!: string;
  @field('avg_focus') avgFocus!: number;
  @field('avg_energy') avgEnergy!: number;
  @field('peak_hours') peakHours!: string;
  @field('total_contexts') totalContexts!: number;
  @field('patterns') patterns!: string;
  @readonly @date('created_at') createdAt!: Date;
}
```

### 4. **Database Setup**

```typescript
// database/database.ts
import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { schema } from './schema';
import { ContextSnapshot, SyncQueueItem, DailyInsight } from './models';

const adapter = new SQLiteAdapter({
  schema,
  jsi: true, // ⚡ Ultra-fast JSI mode (New Architecture)
  onSetUpError: (error) => {
    console.error('Database setup error:', error);
  },
});

export const database = new Database({
  adapter,
  modelClasses: [ContextSnapshot, SyncQueueItem, DailyInsight],
});
```

## 🎯 Core Hybrid Storage Service

```typescript
// services/storage/HybridStorageService.ts
import { MMKV } from 'react-native-mmkv';
import { database } from '@/database/database';
import { ContextSnapshot, SyncQueueItem } from '@/database/models';
import { supabase } from '@/lib/supabase';
import { STORAGE_CONFIG } from '@/config/storage.config';
import pako from 'pako';
import { Q } from '@nozbe/watermelondb';
import NetInfo from '@react-native-community/netinfo';

interface Context {
  focusLevel: number;
  energyLevel: number;
  moodState: string;
  activityPattern: string;
  timestamp?: number;
}

interface AggregatedContext {
  timestamp: number;
  focusLevel: number;
  energyLevel: number;
  moodState: string;
  activityPattern: string;
  contextHash: string;
}

export class HybridStorageService {
  private static instance: HybridStorageService;
  private hotStorage: MMKV;
  private lastCleanup: number = 0;
  private syncInProgress: boolean = false;
  private isConnected: boolean = true;

  private constructor() {
    // Initialize MMKV with encryption
    this.hotStorage = new MMKV({
      id: 'cae-hot-storage',
      encryptionKey: this.generateEncryptionKey(),
    });

    // Monitor network connectivity
    this.setupNetworkMonitoring();

    // Start background tasks
    this.startBackgroundTasks();
  }

  public static getInstance(): HybridStorageService {
    if (!HybridStorageService.instance) {
      HybridStorageService.instance = new HybridStorageService();
    }
    return HybridStorageService.instance;
  }

  // ═══════════════════════════════════════════════════════════════
  // 🔥 HOT PATH: Store Context (Ultra-Fast, <5ms)
  // ═══════════════════════════════════════════════════════════════
  async storeContext(context: Context): Promise<void> {
    const timestamp = context.timestamp || Date.now();

    try {
      // 1. INSTANT: Write to MMKV (0-2ms)
      const aggregated = this.aggregateContext({ ...context, timestamp });
      const key = `ctx:${timestamp}`;

      this.hotStorage.set(key, JSON.stringify(aggregated));

      // 2. ASYNC: Queue for warm storage (non-blocking)
      this.queueForWarmStorage(aggregated);

      // 3. PERIODIC: Check if cleanup needed
      this.checkAndCleanup();

    } catch (error) {
      console.error('Error storing context:', error);
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 🔍 GET: Recent Insights (From MMKV, <10ms)
  // ═══════════════════════════════════════════════════════════════
  async getRecentInsights(hours: number = 24): Promise<any> {
    const cutoff = Date.now() - hours * 60 * 60 * 1000;
    const allKeys = this.hotStorage.getAllKeys();

    const recentKeys = allKeys
      .filter(key => key.startsWith('ctx:'))
      .filter(key => {
        const timestamp = parseInt(key.split(':')[1]);
        return timestamp >= cutoff;
      })
      .sort((a, b) => {
        const tsA = parseInt(a.split(':')[1]);
        const tsB = parseInt(b.split(':')[1]);
        return tsB - tsA; // Descending
      });

    const snapshots: AggregatedContext[] = recentKeys.map(key => {
      const data = this.hotStorage.getString(key);
      return data ? JSON.parse(data) : null;
    }).filter(Boolean);

    return this.calculateInsights(snapshots);
  }

  // ═══════════════════════════════════════════════════════════════
  // 📊 GET: Historical Insights (From WatermelonDB, <100ms)
  // ═══════════════════════════════════════════════════════════════
  async getHistoricalInsights(days: number = 7): Promise<any> {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

    const snapshots = await database.collections
      .get<ContextSnapshot>('context_snapshots')
      .query(
        Q.where('timestamp', Q.gte(cutoff)),
        Q.sortBy('timestamp', Q.desc)
      )
      .fetch();

    const data = snapshots.map(s => ({
      timestamp: s.timestamp,
      focusLevel: s.focusLevel,
      energyLevel: s.energyLevel,
      moodState: s.moodState,
      activityPattern: s.activityPattern,
    }));

    return this.calculateInsights(data);
  }

  // ═══════════════════════════════════════════════════════════════
  // 🌤️ GET: Pre-computed Daily Insights (Instant, <5ms)
  // ═══════════════════════════════════════════════════════════════
  async getDailyInsights(date: string): Promise<any> {
    const insight = await database.collections
      .get<DailyInsight>('daily_insights')
      .query(Q.where('date', date))
      .fetch();

    if (insight.length > 0) {
      const data = insight[0];
      return {
        date: data.date,
        avgFocus: data.avgFocus,
        avgEnergy: data.avgEnergy,
        peakHours: JSON.parse(data.peakHours),
        totalContexts: data.totalContexts,
        patterns: JSON.parse(data.patterns),
      };
    }

    return null;
  }

  // ═══════════════════════════════════════════════════════════════
  // 🔄 WARM STORAGE: Queue for WatermelonDB
  // ═══════════════════════════════════════════════════════════════
  private async queueForWarmStorage(context: AggregatedContext): Promise<void> {
    try {
      // Use WatermelonDB batch for performance
      await database.write(async () => {
        const collection = database.collections.get<ContextSnapshot>('context_snapshots');

        await collection.create(snapshot => {
          snapshot.timestamp = context.timestamp;
          snapshot.focusLevel = context.focusLevel;
          snapshot.energyLevel = context.energyLevel;
          snapshot.moodState = context.moodState;
          snapshot.activityPattern = context.activityPattern;
          snapshot.contextHash = context.contextHash;
          snapshot.synced = false;
        });
      });

      // Add to sync queue for cloud upload
      await this.addToSyncQueue({
        operation: 'insert',
        tableName: 'context_snapshots',
        recordId: context.contextHash,
        payload: JSON.stringify(context),
      });

    } catch (error) {
      console.error('Error queuing for warm storage:', error);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // ☁️ CLOUD SYNC: Push to Supabase (Batched, Smart)
  // ═══════════════════════════════════════════════════════════════
  async syncToCloud(): Promise<void> {
    if (this.syncInProgress || !this.isConnected) {
      return;
    }

    this.syncInProgress = true;

    try {
      // Get unsynced items
      const queueItems = await database.collections
        .get<SyncQueueItem>('sync_queue')
        .query(
          Q.sortBy('created_at', Q.asc),
          Q.take(STORAGE_CONFIG.cold.batchSize)
        )
        .fetch();

      if (queueItems.length === 0) {
        this.syncInProgress = false;
        return;
      }

      // Prepare batch
      const batch = queueItems.map(item => ({
        id: item.recordId,
        ...JSON.parse(item.payload),
      }));

      // Compress if enabled
      let payload = batch;
      if (STORAGE_CONFIG.cold.compression && batch.length > 10) {
        payload = this.compressBatch(batch);
      }

      // Upload to Supabase
      const { data, error } = await supabase
        .from('context_snapshots')
        .upsert(batch, {
          onConflict: 'id',
          ignoreDuplicates: false,
        });

      if (error) {
        console.error('Sync error:', error);
        // Increment attempt count
        await this.incrementSyncAttempts(queueItems);
      } else {
        // Mark as synced
        await this.markAsSynced(queueItems);

        // Update local records
        await this.updateLocalSyncStatus(batch.map(b => b.id));
      }

    } catch (error) {
      console.error('Cloud sync failed:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 🧹 CLEANUP: Hot → Warm → Cold
  // ═══════════════════════════════════════════════════════════════
  private async checkAndCleanup(): Promise<void> {
    const now = Date.now();

    // Only cleanup every 30 minutes
    if (now - this.lastCleanup < STORAGE_CONFIG.hot.checkInterval) {
      return;
    }

    this.lastCleanup = now;

    try {
      // 1. Clean hot storage (MMKV)
      await this.cleanupHotStorage();

      // 2. Clean warm storage (WatermelonDB)
      await this.cleanupWarmStorage();

      // 3. Generate daily insights
      await this.generateDailyInsights();

    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }

  private async cleanupHotStorage(): Promise<void> {
    const cutoff = Date.now() - STORAGE_CONFIG.hot.retention;
    const allKeys = this.hotStorage.getAllKeys();

    const oldKeys = allKeys
      .filter(key => key.startsWith('ctx:'))
      .filter(key => {
        const timestamp = parseInt(key.split(':')[1]);
        return timestamp < cutoff;
      });

    // Delete old keys
    oldKeys.forEach(key => this.hotStorage.delete(key));

    console.log(`Cleaned ${oldKeys.length} old hot storage entries`);
  }

  private async cleanupWarmStorage(): Promise<void> {
    const cutoff = Date.now() - STORAGE_CONFIG.warm.retention;

    // Delete old snapshots (already synced to cloud)
    await database.write(async () => {
      const oldSnapshots = await database.collections
        .get<ContextSnapshot>('context_snapshots')
        .query(
          Q.where('timestamp', Q.lt(cutoff)),
          Q.where('synced', true)
        )
        .fetch();

      const deletePromises = oldSnapshots.map(s => s.markAsDeleted());
      await Promise.all(deletePromises);
    });

    // Clean sync queue (successful syncs older than 7 days)
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    await database.write(async () => {
      const oldQueue = await database.collections
        .get<SyncQueueItem>('sync_queue')
        .query(Q.where('created_at', Q.lt(sevenDaysAgo)))
        .fetch();

      const deletePromises = oldQueue.map(q => q.markAsDeleted());
      await Promise.all(deletePromises);
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // 📈 INSIGHTS: Pre-compute daily aggregations
  // ═══════════════════════════════════════════════════════════════
  private async generateDailyInsights(): Promise<void> {
    const today = new Date().toISOString().split('T')[0];

    // Check if already computed
    const existing = await database.collections
      .get<DailyInsight>('daily_insights')
      .query(Q.where('date', today))
      .fetch();

    if (existing.length > 0) return; // Already computed

    // Get today's snapshots
    const startOfDay = new Date(today).getTime();
    const endOfDay = startOfDay + 24 * 60 * 60 * 1000;

    const snapshots = await database.collections
      .get<ContextSnapshot>('context_snapshots')
      .query(
        Q.where('timestamp', Q.gte(startOfDay)),
        Q.where('timestamp', Q.lt(endOfDay))
      )
      .fetch();

    if (snapshots.length === 0) return;

    // Calculate aggregations
    const avgFocus = snapshots.reduce((sum, s) => sum + s.focusLevel, 0) / snapshots.length;
    const avgEnergy = snapshots.reduce((sum, s) => sum + s.energyLevel, 0) / snapshots.length;

    // Find peak hours
    const hourlyFocus: { [hour: number]: number[] } = {};
    snapshots.forEach(s => {
      const hour = new Date(s.timestamp).getHours();
      if (!hourlyFocus[hour]) hourlyFocus[hour] = [];
      hourlyFocus[hour].push(s.focusLevel);
    });

    const peakHours = Object.entries(hourlyFocus)
      .map(([hour, values]) => ({
        hour: parseInt(hour),
        avgFocus: values.reduce((a, b) => a + b, 0) / values.length,
      }))
      .sort((a, b) => b.avgFocus - a.avgFocus)
      .slice(0, 3)
      .map(h => h.hour);

    // Store insight
    await database.write(async () => {
      const collection = database.collections.get<DailyInsight>('daily_insights');

      await collection.create(insight => {
        insight.date = today;
        insight.avgFocus = avgFocus;
        insight.avgEnergy = avgEnergy;
        insight.peakHours = JSON.stringify(peakHours);
        insight.totalContexts = snapshots.length;
        insight.patterns = JSON.stringify({}); // Add pattern detection logic
      });
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // 🛠️ UTILITY METHODS
  // ═══════════════════════════════════════════════════════════════

  private aggregateContext(context: Context & { timestamp: number }): AggregatedContext {
    // Generate hash for deduplication
    const contextHash = this.generateContextHash(context);

    return {
      timestamp: context.timestamp,
      focusLevel: Math.round(context.focusLevel * 100) / 100,
      energyLevel: Math.round(context.energyLevel * 100) / 100,
      moodState: context.moodState,
      activityPattern: context.activityPattern,
      contextHash,
    };
  }

  private generateContextHash(context: Partial<Context>): string {
    const str = `${context.focusLevel}-${context.energyLevel}-${context.moodState}`;
    return `${Date.now()}-${str.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0)}`;
  }

  private calculateInsights(snapshots: AggregatedContext[]): any {
    if (snapshots.length === 0) {
      return {
        avgFocus: 0,
        avgEnergy: 0,
        trend: 'stable',
        peakTime: null,
        totalSamples: 0,
      };
    }

    const avgFocus = snapshots.reduce((sum, s) => sum + s.focusLevel, 0) / snapshots.length;
    const avgEnergy = snapshots.reduce((sum, s) => sum + s.energyLevel, 0) / snapshots.length;

    // Calculate trend (last 25% vs first 25%)
    const quarterSize = Math.floor(snapshots.length / 4);
    const recentAvg = snapshots.slice(0, quarterSize).reduce((sum, s) => sum + s.focusLevel, 0) / quarterSize;
    const olderAvg = snapshots.slice(-quarterSize).reduce((sum, s) => sum + s.focusLevel, 0) / quarterSize;

    let trend = 'stable';
    if (recentAvg > olderAvg * 1.1) trend = 'improving';
    else if (recentAvg < olderAvg * 0.9) trend = 'declining';

    return {
      avgFocus: Math.round(avgFocus * 100) / 100,
      avgEnergy: Math.round(avgEnergy * 100) / 100,
      trend,
      totalSamples: snapshots.length,
      timeRange: {
        start: snapshots[snapshots.length - 1]?.timestamp,
        end: snapshots[0]?.timestamp,
      },
    };
  }

  private async addToSyncQueue(item: {
    operation: 'insert' | 'update' | 'delete';
    tableName: string;
    recordId: string;
    payload: string;
  }): Promise<void> {
    await database.write(async () => {
      const collection = database.collections.get<SyncQueueItem>('sync_queue');

      await collection.create(queueItem => {
        queueItem.operation = item.operation;
        queueItem.tableName = item.tableName;
        queueItem.recordId = item.recordId;
        queueItem.payload = item.payload;
        queueItem.attempts = 0;
      });
    });
  }

  private async markAsSynced(items: SyncQueueItem[]): Promise<void> {
    await database.write(async () => {
      const deletePromises = items.map(item => item.markAsDeleted());
      await Promise.all(deletePromises);
    });
  }

  private async updateLocalSyncStatus(recordIds: string[]): Promise<void> {
    await database.write(async () => {
      const snapshots = await database.collections
        .get<ContextSnapshot>('context_snapshots')
        .query(Q.where('context_hash', Q.oneOf(recordIds)))
        .fetch();

      const updatePromises = snapshots.map(snapshot =>
        snapshot.update(s => {
          s.synced = true;
          s.syncedAt = Date.now();
        })
      );

      await Promise.all(updatePromises);
    });
  }

  private async incrementSyncAttempts(items: SyncQueueItem[]): Promise<void> {
    await database.write(async () => {
      const updatePromises = items.map(item =>
        item.update(i => {
          i.attempts += 1;
          i.lastAttempt = Date.now();
        })
      );

      await Promise.all(updatePromises);
    });
  }

  private compressBatch(batch: any[]): any {
    const jsonString = JSON.stringify(batch);
    const compressed = pako.gzip(jsonString);
    return { compressed: true, data: compressed };
  }

  private generateEncryptionKey(): string {
    // In production, use secure key storage
    return 'cae-2.0-secure-key-change-in-production';
  }

  private setupNetworkMonitoring(): void {
    NetInfo.addEventListener(state => {
      this.isConnected = state.isConnected ?? false;

      if (this.isConnected) {
        // Trigger sync when connection is restored
        setTimeout(() => this.syncToCloud(), 2000);
      }
    });
  }

  private startBackgroundTasks(): void {
    // Sync every 15 minutes
    setInterval(() => {
      if (this.isConnected) {
        this.syncToCloud();
      }
    }, STORAGE_CONFIG.warm.syncInterval);

    // Cleanup every 30 minutes
    setInterval(() => {
      this.checkAndCleanup();
    }, STORAGE_CONFIG.hot.checkInterval);
  }

  // ═══════════════════════════════════════════════════════════════
  // 🔍 PUBLIC QUERY METHODS
  // ═══════════════════════════════════════════════════════════════

  async getContextCount(): Promise<number> {
    const hotCount = this.hotStorage.getAllKeys().filter(k => k.startsWith('ctx:')).length;
    const warmCount = await database.collections
      .get<ContextSnapshot>('context_snapshots')
      .query()
      .fetchCount();

    return hotCount + warmCount;
  }

  async getStorageStats(): Promise<any> {
    const hotKeys = this.hotStorage.getAllKeys().filter(k => k.startsWith('ctx:'));
    const hotSize = hotKeys.reduce((sum, key) => {
      const data = this.hotStorage.getString(key);
      return sum + (data?.length || 0);
    }, 0);

    const warmCount = await database.collections
      .get<ContextSnapshot>('context_snapshots')
      .query()
      .


Excellent — the file already covers your **local tier and Supabase sync** foundation beautifully. To complete the plan, you need three final modules that make this a production-grade, fully autonomous system:

---

## ☁️ 5. Supabase Cloud Layer (Server + Functions)

### **a. Database Tables**

In your Supabase Postgres schema, define:

```sql
create table if not exists context_snapshots (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id),
  timestamp bigint not null,
  focus_level numeric(4,2),
  energy_level numeric(4,2),
  mood_state text,
  activity_pattern text,
  context_hash text unique,
  synced_at timestamptz default now(),
  inserted_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists daily_insights (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id),
  date date not null,
  avg_focus numeric(4,2),
  avg_energy numeric(4,2),
  peak_hours jsonb,
  total_contexts int,
  patterns jsonb,
  created_at timestamptz default now()
);

### **b. Edge Function for Batched Sync**

Create `/functions/apply_deltas/index.ts`:

```typescript
import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js";

serve(async (req) => {
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { user_id, batch } = await req.json();

  if (!user_id || !Array.isArray(batch)) {
    return new Response(JSON.stringify({ error: "Invalid payload" }), { status: 400 });
  }

  const { error } = await supabase
    .from("context_snapshots")
    .upsert(
      batch.map((item) => ({
        user_id,
        timestamp: item.timestamp,
        focus_level: item.focusLevel,
        energy_level: item.energyLevel,
        mood_state: item.moodState,
        activity_pattern: item.activityPattern,
        context_hash: item.contextHash,
      })),
      { onConflict: "context_hash" }
    );

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  return new Response(JSON.stringify({ success: true }));
});
```

Then deploy:

```bash
supabase functions deploy apply_deltas
```

Your app’s `syncToCloud()` will call this endpoint instead of directly upserting into the table. This allows server-side validation, compression, and versioning logic.

---

### **c. Scheduled Aggregation Function (Daily Summary)**

You can automate summaries with Supabase’s built-in scheduler (`pg_cron`):

```sql
-- Run at midnight daily
select cron.schedule(
  'generate-daily-insights',
  '0 0 * * *',
  $$
    insert into daily_insights (user_id, date, avg_focus, avg_energy, peak_hours, total_contexts, patterns)
    select
      user_id,
      current_date,
      avg(focus_level) as avg_focus,
      avg(energy_level) as avg_energy,
      jsonb_agg(distinct activity_pattern) as peak_hours,
      count(*) as total_contexts,
      '{}'::jsonb as patterns
    from context_snapshots
    where to_timestamp(timestamp / 1000)::date = current_date
    group by user_id;
  $$
);
```

This ensures server-level summaries match your local ones.

---

## 🧠 6. Conflict Resolution Strategy

Supabase does not automatically merge concurrent edits. Add versioning fields to handle this:

```sql
alter table context_snapshots add column if not exists version int default 1;
```

When your app syncs:

* Include the `version` number.
* If a remote row has a higher version, skip local overwrite.
* Otherwise, increment version when updating.

This prevents overwrite of more recent cloud data.

---

## 📊 7. Observability, Backup & Security

**Logging & Observability**

* Add a `sync_logs` table in Supabase for failed uploads.
* Use Edge Functions to log sync attempts per user for debugging.

**Backups**

* Supabase automatically runs daily backups of Postgres, but for resilience:

  ```bash
  supabase db dump --data-only > cae_backup_$(date +%F).sql
  ```

**Security**

* Enable Row-Level Security (RLS):

  ```sql
  alter table context_snapshots enable row level security;
  create policy "Users can access their own data" on context_snapshots
  for all using (auth.uid() = user_id);
  ```
* Use **Service Role keys** only in server functions — not in the mobile app.

---

## 🧩 8. Future Enhancements

1. **Realtime Feed:**
   Subscribe to Supabase Realtime channels for new context events → reflect instantly on multiple devices.

   ```typescript
   supabase
     .channel('context_changes')
     .on('postgres_changes', { event: '*', schema: 'public', table: 'context_snapshots' }, (payload) => {
       console.log('Change detected:', payload);
     })
     .subscribe();
   ```

2. **Edge ML Integration:**
   Add Supabase Vector for on-cloud pattern storage (semantic embeddings of context).

3. **AI Summarization:**
   Deploy another edge function `/generate_insights` that summarizes 24h data using OpenAI’s API, returning a natural-language insight for the user dashboard.

4. **Data Export API:**
   Add `/functions/export_history` for generating and returning compressed user archives (`.gz`).

5. **Multi-user Scaling:**
   Add indexing on `(user_id, timestamp)` for efficient query filtering.

---

With these final components, your CAE 2.0 architecture becomes **a complete, production-grade offline-first intelligence system** powered by Supabase and React Native — capable of handling local caching, adaptive retention, edge analytics, and server aggregation.
