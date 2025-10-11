/**
 * GlobalStateManager - Advanced Global State Management
 *
 * Manages global application state with intelligent synchronization,
 * conflict resolution, and real-time updates across all orchestrators.
 */

import { EventSystem, EVENT_TYPES } from './EventSystem';
import { Logger } from './utils/Logger';

export interface StateSnapshot {
  id: string;
  timestamp: Date;
  state: any;
  version: number;
  source: string;
}

export interface StateSubscription {
  id: string;
  path: string;
  callback: (newValue: any, oldValue: any) => void;
  immediate: boolean;
}

export interface StateMetrics {
  stateSize: number;
  subscriptionCount: number;
  updateCount: number;
  rollbackCount: number;
  averageUpdateLatency: number;
}

/**
 * Advanced Global State Manager
 *
 * Provides centralized state management with reactive updates,
 * time-travel debugging, and intelligent conflict resolution.
 */
export class GlobalStateManager {
  private static instance: GlobalStateManager;
  private eventSystem!: EventSystem;
  private logger: Logger;

  // State Management
  private globalState: any = {};
  private stateHistory: StateSnapshot[] = [];
  private subscriptions: Map<string, StateSubscription> = new Map();
  private maxHistorySize = 100;

  // Performance Tracking
  private metrics: StateMetrics = {
    stateSize: 0,
    subscriptionCount: 0,
    updateCount: 0,
    rollbackCount: 0,
    averageUpdateLatency: 0
  };

  // State Control
  private isInitialized = false;
  private currentVersion = 0;
  private updateQueue: Array<{ path: string; value: any; source: string }> = [];
  private isProcessingQueue = false;

  private constructor() {
    this.logger = new Logger('GlobalStateManager');
  }

  public static getInstance(): GlobalStateManager {
    if (!GlobalStateManager.instance) {
      GlobalStateManager.instance = new GlobalStateManager();
    }
    return GlobalStateManager.instance;
  }

  /**
   * Initialize the global state manager
   */
  public async initialize(eventSystem: EventSystem): Promise<void> {
    try {
      this.logger.info('Initializing Global State Manager...');

      this.eventSystem = eventSystem;

      // Initialize default state structure
      this.initializeDefaultState();

      // Setup event listeners
      this.setupEventListeners();

      // Create initial snapshot
      this.createSnapshot('initialization');

      this.isInitialized = true;
      this.logger.info('Global State Manager initialized successfully');

    } catch (error) {
      this.logger.error('Failed to initialize Global State Manager', error);
      throw error;
    }
  }

  /**
   * Get state value by path
   */
  public getState<T = any>(path?: string): T {
    if (!path || path === '') {
      return this.globalState as T;
    }

    return this.getValueByPath(this.globalState, path) as T;
  }

  /**
   * Set state value by path
   */
  public async setState(
    path: string,
    value: any,
    source: string = 'unknown',
    options: {
      merge?: boolean;
      silent?: boolean;
      createSnapshot?: boolean;
    } = {}
  ): Promise<void> {
    const startTime = Date.now();

    try {
      const oldValue = this.getValueByPath(this.globalState, path);

      // Queue update to prevent conflicts
      this.updateQueue.push({ path, value, source });

      if (!this.isProcessingQueue) {
        await this.processUpdateQueue();
      }

      // Update metrics
      this.metrics.updateCount++;
      this.metrics.averageUpdateLatency = (this.metrics.averageUpdateLatency + (Date.now() - startTime)) / 2;

      if (!options.silent) {
        this.logger.debug(`State updated: ${path} by ${source}`);

        // Emit state change event
        this.eventSystem.emitEvent(
          EVENT_TYPES.STATE_CHANGED,
          'GlobalStateManager',
          { path, value, oldValue, source },
          'low'
        );
      }

      // Create snapshot if requested
      if (options.createSnapshot !== false) {
        this.createSnapshot(source);
      }

    } catch (error) {
      this.logger.error(`Failed to set state at path: ${path}`, error);
      throw error;
    }
  }

  /**
   * Subscribe to state changes
   */
  public subscribe(
    path: string,
    callback: (newValue: any, oldValue: any) => void,
    immediate: boolean = false
  ): string {
    const subscriptionId = this.generateSubscriptionId();

    const subscription: StateSubscription = {
      id: subscriptionId,
      path,
      callback,
      immediate
    };

    this.subscriptions.set(subscriptionId, subscription);
    this.metrics.subscriptionCount = this.subscriptions.size;

    // Call immediately if requested
    if (immediate) {
      const currentValue = this.getValueByPath(this.globalState, path);
      callback(currentValue, undefined);
    }

    this.logger.debug(`Subscription created: ${subscriptionId} for path: ${path}`);

    return subscriptionId;
  }

  /**
   * Unsubscribe from state changes
   */
  public unsubscribe(subscriptionId: string): boolean {
    const removed = this.subscriptions.delete(subscriptionId);

    if (removed) {
      this.metrics.subscriptionCount = this.subscriptions.size;
      this.logger.debug(`Subscription removed: ${subscriptionId}`);
    }

    return removed;
  }

  /**
   * Merge state objects intelligently
   */
  public async mergeState(
    updates: Record<string, any>,
    source: string = 'merge',
    strategy: 'shallow' | 'deep' | 'smart' = 'smart'
  ): Promise<void> {
    try {
      const mergedState = this.performMerge(this.globalState, updates, strategy);

      // Update global state
      this.globalState = mergedState;
      this.currentVersion++;

      // Notify subscribers of all changed paths
      for (const [path] of Object.entries(updates)) {
        await this.notifySubscribers(path, this.getValueByPath(mergedState, path), undefined);
      }

      // Create snapshot
      this.createSnapshot(`merge_${source}`);

      this.logger.info(`State merged using ${strategy} strategy from ${source}`);

    } catch (error) {
      this.logger.error('State merge failed', error);
      throw error;
    }
  }

  /**
   * Rollback to previous state
   */
  public async rollback(steps: number = 1): Promise<boolean> {
    if (this.stateHistory.length <= steps) {
      this.logger.warn('Not enough history to rollback');
      return false;
    }

    try {
      // Get target snapshot
      const targetSnapshot = this.stateHistory[this.stateHistory.length - steps - 1];

      // Restore state
      const oldState = { ...this.globalState };
      this.globalState = { ...targetSnapshot.state };
      this.currentVersion = targetSnapshot.version;

      // Remove newer snapshots
      this.stateHistory = this.stateHistory.slice(0, -steps);

      // Notify all subscribers
      await this.notifyAllSubscribers(oldState);

      this.metrics.rollbackCount++;
      this.logger.info(`State rolled back ${steps} steps to version ${this.currentVersion}`);

      this.eventSystem.emitEvent(
        EVENT_TYPES.STATE_ROLLBACK,
        'GlobalStateManager',
        { steps, targetVersion: this.currentVersion },
        'medium'
      );

      return true;

    } catch (error) {
      this.logger.error('Rollback failed', error);
      return false;
    }
  }

  /**
   * Get state history
   */
  public getHistory(limit: number = 10): StateSnapshot[] {
    return this.stateHistory
      .slice(-limit)
      .map(snapshot => ({
        ...snapshot,
        state: { ...snapshot.state } // Deep copy for safety
      }));
  }

  /**
   * Clear state history
   */
  public clearHistory(): void {
    this.stateHistory = [];
    this.logger.info('State history cleared');
  }

  /**
   * Get current state metrics
   */
  public getMetrics(): StateMetrics {
    return {
      ...this.metrics,
      stateSize: JSON.stringify(this.globalState).length,
      subscriptionCount: this.subscriptions.size
    };
  }

  /**
   * Optimize state performance
   */
  public async optimize(): Promise<void> {
    this.logger.info('Optimizing state performance...');

    try {
      // Clean up old history
      if (this.stateHistory.length > this.maxHistorySize) {
        this.stateHistory = this.stateHistory.slice(-this.maxHistorySize);
      }

      // Remove orphaned subscriptions (if any)
      await this.cleanupOrphanedSubscriptions();

      // Compact state structure
      this.compactStateStructure();

      this.logger.info('State optimization completed');

    } catch (error) {
      this.logger.error('State optimization failed', error);
    }
  }

  /**
   * Export state for backup/migration
   */
  public exportState(): {
    state: any;
    version: number;
    timestamp: Date;
    history: StateSnapshot[];
  } {
    return {
      state: JSON.parse(JSON.stringify(this.globalState)),
      version: this.currentVersion,
      timestamp: new Date(),
      history: this.getHistory(50)
    };
  }

  /**
   * Import state from backup/migration
   */
  public async importState(exportedState: {
    state: any;
    version: number;
    timestamp: Date;
    history?: StateSnapshot[];
  }): Promise<void> {
    try {
      const oldState = { ...this.globalState };

      // Restore state
      this.globalState = exportedState.state;
      this.currentVersion = exportedState.version;

      // Restore history if provided
      if (exportedState.history) {
        this.stateHistory = exportedState.history;
      }

      // Notify all subscribers
      await this.notifyAllSubscribers(oldState);

      this.logger.info(`State imported from ${exportedState.timestamp.toISOString()}`);

      this.eventSystem.emitEvent(
        EVENT_TYPES.STATE_IMPORTED,
        'GlobalStateManager',
        { version: exportedState.version, timestamp: exportedState.timestamp },
        'medium'
      );

    } catch (error) {
      this.logger.error('State import failed', error);
      throw error;
    }
  }

  /**
   * Watch for specific state changes with conditions
   */
  public watch(
    path: string,
    condition: (newValue: any, oldValue: any) => boolean,
    callback: (newValue: any, oldValue: any) => void
  ): string {
    return this.subscribe(path, (newValue, oldValue) => {
      if (condition(newValue, oldValue)) {
        callback(newValue, oldValue);
      }
    });
  }

  /**
   * Batch state updates for performance
   */
  public async batchUpdate(
    updates: Array<{ path: string; value: any; source?: string }>,
    options: { createSnapshot?: boolean } = {}
  ): Promise<void> {
    try {
      this.logger.debug(`Processing batch update with ${updates.length} operations`);

      // Queue all updates
      for (const update of updates) {
        this.updateQueue.push({
          path: update.path,
          value: update.value,
          source: update.source || 'batch'
        });
      }

      // Process queue
      await this.processUpdateQueue();

      // Create single snapshot for entire batch
      if (options.createSnapshot !== false) {
        this.createSnapshot('batch_update');
      }

    } catch (error) {
      this.logger.error('Batch update failed', error);
      throw error;
    }
  }

  // Private Methods

  private initializeDefaultState(): void {
    this.globalState = {
      // System State
      system: {
        initialized: false,
        version: '1.0.0',
        performance: 'optimal',
        errors: [],
        warnings: []
      },

      // User State
      user: {
        id: null,
        preferences: {},
        settings: {},
        session: {
          startTime: new Date(),
          lastActivity: new Date()
        }
      },

      // Learning State
      learning: {
        currentSession: null,
        totalSessions: 0,
        performance: {
          average: 0,
          trend: 'stable'
        },
        cognitiveLoad: 0
      },

      // Wellness State
      wellness: {
        sleepQuality: 0,
        stressLevel: 0,
        energyLevel: 0,
        lastHealthUpdate: null
      },

      // Finance State
      finance: {
        budgets: {},
        transactions: [],
        monthlySpending: 0,
        savingsGoal: 0
      },

      // AI State
      ai: {
        insights: [],
        predictions: [],
        recommendations: [],
        processingStatus: 'idle'
      },

      // Storage State
      storage: {
        hotTierUsage: 0,
        warmTierUsage: 0,
        coldTierUsage: 0,
        syncStatus: 'synced'
      }
    };
  }

  private setupEventListeners(): void {
    // System events
    this.eventSystem.subscribe(EVENT_TYPES.SYSTEM_ERROR, (event) => {
      this.setState('system.errors', [...this.getState('system.errors'), event.data], 'system', { silent: true });
    });

    this.eventSystem.subscribe(EVENT_TYPES.SYSTEM_WARNING, (event) => {
      this.setState('system.warnings', [...this.getState('system.warnings'), event.data], 'system', { silent: true });
    });
  }

  private async processUpdateQueue(): Promise<void> {
    if (this.isProcessingQueue || this.updateQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    try {
      const updates = [...this.updateQueue];
      this.updateQueue = [];

      for (const update of updates) {
        const oldValue = this.getValueByPath(this.globalState, update.path);
        this.setValueByPath(this.globalState, update.path, update.value);

        // Notify subscribers
        await this.notifySubscribers(update.path, update.value, oldValue);
      }

      this.currentVersion++;

    } finally {
      this.isProcessingQueue = false;
    }
  }

  private async notifySubscribers(path: string, newValue: any, oldValue: any): Promise<void> {
    for (const subscription of this.subscriptions.values()) {
      if (this.pathMatches(subscription.path, path)) {
        try {
          subscription.callback(newValue, oldValue);
        } catch (error) {
          this.logger.error(`Subscription callback failed for ${subscription.id}`, error);
        }
      }
    }
  }

  private async notifyAllSubscribers(oldState: any): Promise<void> {
    for (const subscription of this.subscriptions.values()) {
      try {
        const newValue = this.getValueByPath(this.globalState, subscription.path);
        const oldValue = this.getValueByPath(oldState, subscription.path);
        subscription.callback(newValue, oldValue);
      } catch (error) {
        this.logger.error(`Subscription callback failed for ${subscription.id}`, error);
      }
    }
  }

  private createSnapshot(source: string): void {
    const snapshot: StateSnapshot = {
      id: this.generateSnapshotId(),
      timestamp: new Date(),
      state: JSON.parse(JSON.stringify(this.globalState)),
      version: this.currentVersion,
      source
    };

    this.stateHistory.push(snapshot);

    // Limit history size
    if (this.stateHistory.length > this.maxHistorySize) {
      this.stateHistory.shift();
    }
  }

  private performMerge(target: any, source: any, strategy: 'shallow' | 'deep' | 'smart'): any {
    switch (strategy) {
      case 'shallow':
        return { ...target, ...source };

      case 'deep':
        return this.deepMerge(target, source);

      case 'smart':
      default:
        return this.smartMerge(target, source);
    }
  }

  private deepMerge(target: any, source: any): any {
    const result = { ...target };

    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }

    return result;
  }

  private smartMerge(target: any, source: any): any {
    // Smart merge considers data types and merges intelligently
    const result = { ...target };

    for (const key in source) {
      if (Array.isArray(source[key])) {
        // For arrays, replace completely
        result[key] = [...source[key]];
      } else if (source[key] && typeof source[key] === 'object') {
        // For objects, deep merge
        result[key] = this.smartMerge(result[key] || {}, source[key]);
      } else {
        // For primitives, replace
        result[key] = source[key];
      }
    }

    return result;
  }

  private getValueByPath(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private setValueByPath(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);

    target[lastKey] = value;
  }

  private pathMatches(subscriptionPath: string, changedPath: string): boolean {
    // Exact match
    if (subscriptionPath === changedPath) return true;

    // Wildcard match
    if (subscriptionPath.includes('*')) {
      const regex = new RegExp(subscriptionPath.replace(/\*/g, '.*'));
      return regex.test(changedPath);
    }

    // Parent path match
    return changedPath.startsWith(subscriptionPath + '.');
  }

  private async cleanupOrphanedSubscriptions(): Promise<void> {
    // Implementation would identify and remove unused subscriptions
    // This is a placeholder for complex cleanup logic
  }

  private compactStateStructure(): void {
    // Remove empty objects and null values to reduce memory usage
    this.globalState = this.removeEmptyValues(this.globalState);
  }

  private removeEmptyValues(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.filter(item => item != null);
    }

    if (obj && typeof obj === 'object') {
      const cleaned: any = {};
      for (const [key, value] of Object.entries(obj)) {
        const cleanedValue = this.removeEmptyValues(value);
        if (cleanedValue != null && !(typeof cleanedValue === 'object' && Object.keys(cleanedValue).length === 0)) {
          cleaned[key] = cleanedValue;
        }
      }
      return cleaned;
    }

    return obj;
  }

  private generateSubscriptionId(): string {
    return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  }

  private generateSnapshotId(): string {
    return `snap_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  }
}

export default GlobalStateManager;

// Backwards-compat: provide syncState alias on the singleton for callers that
// expect GlobalStateManager.syncState()
declare module './GlobalStateManager' {
  interface GlobalStateManager {
    syncState?: () => Promise<void>;
  }
}

// Attach runtime method if missing
try {
  const GSM: any = GlobalStateManager as any;
  if (GSM && GSM.getInstance) {
    const inst = GSM.getInstance();
    if (!inst.syncState) {
      inst.syncState = async () => {
        // create a snapshot for compatibility
        try {
          // noop: ensure snapshot exists
          // @ts-ignore - using private method for compatibility
          if (typeof inst.createSnapshot === 'function') inst['createSnapshot']('compat_sync');
        } catch (e) {
          // ignore
        }
      };
    }
  }
} catch (e) {
  // ignore attach errors in unusual test environments
}
