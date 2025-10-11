/**
 * SupabaseAdapter - Supabase Integration Adapter
 *
 * Adapter for integrating with Supabase backend services including
 * real-time subscriptions, authentication, and database operations
 * for the NeuroLearn orchestration engine.
 */

import { Logger } from '../utils/Logger';
import SupabaseStorageService from '../../services/storage/SupabaseStorageCompat';

export interface SupabaseConfig {
  enableRealTimeSync: boolean;
  enableAuth: boolean;
  enableStorage: boolean;
  enableFunctions: boolean;
  subscriptionChannels: string[];
  conflictResolution: 'client' | 'server' | 'last_write_wins';
}

export interface RealtimeSubscription {
  channel: string;
  table: string;
  filter?: string;
  callback: (payload: any) => void;
}

export interface SupabaseQuery {
  table: string;
  select?: string;
  filter?: any;
  order?: any;
  limit?: number;
  offset?: number;
}

/**
 * Supabase Adapter
 *
 * Provides unified access to Supabase backend services.
 */
export class SupabaseAdapter {
  private logger: Logger;
  private supabaseStorage: any;
  private config: SupabaseConfig;

  private isInitialized = false;
  private activeSubscriptions: Map<string, RealtimeSubscription> = new Map();
  private connectionStatus: 'connected' | 'connecting' | 'disconnected' = 'disconnected';

  constructor(config?: Partial<SupabaseConfig>) {
    this.logger = new Logger('SupabaseAdapter');
    this.config = {
      enableRealTimeSync: true,
      enableAuth: true,
      enableStorage: true,
      enableFunctions: true,
      subscriptionChannels: ['learning_sessions', 'user_progress', 'insights'],
      conflictResolution: 'last_write_wins',
      ...config
    };
  }

  /**
   * Initialize the Supabase adapter
   */
  public async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing Supabase Adapter...');
      this.connectionStatus = 'connecting';

      // Initialize Supabase storage service
      this.supabaseStorage = SupabaseStorageService.getInstance();
      await this.supabaseStorage.initialize();

      // Setup real-time subscriptions if enabled
      if (this.config.enableRealTimeSync) {
        await this.setupRealtimeSubscriptions();
      }

      this.connectionStatus = 'connected';
      this.isInitialized = true;
      this.logger.info('Supabase Adapter initialized successfully');

    } catch (error) {
      this.connectionStatus = 'disconnected';
      this.logger.error('Failed to initialize Supabase Adapter', error);
      throw error;
    }
  }

  /**
   * Store learning session data
   */
  public async storeLearningSession(sessionData: any): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('SupabaseAdapter not initialized');
    }

    try {
      const record = {
        id: sessionData.id,
        user_id: sessionData.userId,
        session_type: sessionData.type,
        start_time: sessionData.startTime,
        end_time: sessionData.endTime,
        duration: sessionData.duration,
        performance_score: sessionData.performance,
        cognitive_load: sessionData.cognitiveLoad,
        interruptions: sessionData.interruptions,
        context_factors: sessionData.contextFactors,
        metadata: sessionData.metadata,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await this.supabaseStorage.upsert('learning_sessions', record);
      this.logger.info('Learning session stored in Supabase', { sessionId: record.id });

    } catch (error) {
      this.logger.error('Failed to store learning session in Supabase', error);
      throw error;
    }
  }

  /**
   * Store user progress data
   */
  public async storeUserProgress(progressData: any): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('SupabaseAdapter not initialized');
    }

    try {
      const record = {
        user_id: progressData.userId,
        domain: progressData.domain,
        metric: progressData.metric,
        value: progressData.value,
        timestamp: progressData.timestamp || new Date().toISOString(),
        context: progressData.context,
        created_at: new Date().toISOString()
      };

      await this.supabaseStorage.insert('user_progress', record);
      this.logger.info('User progress stored in Supabase', { domain: record.domain, metric: record.metric });

    } catch (error) {
      this.logger.error('Failed to store user progress in Supabase', error);
      throw error;
    }
  }

  /**
   * Store AI insights
   */
  public async storeInsight(insightData: any): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('SupabaseAdapter not initialized');
    }

    try {
      const record = {
        id: insightData.id,
        user_id: insightData.userId,
        type: insightData.type,
        domain: insightData.domain,
        priority: insightData.priority,
        confidence: insightData.confidence,
        data: insightData.data,
        actions: insightData.actions,
        status: 'active',
        created_at: insightData.timestamp || new Date().toISOString(),
        expires_at: this.calculateExpirationDate(insightData.type)
      };

      await this.supabaseStorage.upsert('insights', record);
      this.logger.info('Insight stored in Supabase', { insightId: record.id, type: record.type });

    } catch (error) {
      this.logger.error('Failed to store insight in Supabase', error);
      throw error;
    }
  }

  /**
   * Query data from Supabase
   */
  public async query(queryConfig: SupabaseQuery): Promise<any[]> {
    if (!this.isInitialized) {
      throw new Error('SupabaseAdapter not initialized');
    }

    try {
      const result = await this.supabaseStorage.query({
        table: queryConfig.table,
        select: queryConfig.select,
        where: queryConfig.filter,
        orderBy: queryConfig.order,
        limit: queryConfig.limit,
        offset: queryConfig.offset
      });

      return result.data || [];

    } catch (error) {
      this.logger.error('Failed to query Supabase', error);
      return [];
    }
  }

  /**
   * Get learning analytics
   */
  public async getLearningAnalytics(userId: string, timeframe: string = '30d'): Promise<any> {
    if (!this.isInitialized) {
      throw new Error('SupabaseAdapter not initialized');
    }

    try {
      const cutoffDate = this.getTimeframeCutoff(timeframe);

      const sessions = await this.query({
        table: 'learning_sessions',
        select: '*',
        filter: {
          user_id: userId,
          created_at: { $gte: cutoffDate.toISOString() }
        },
        order: { created_at: 'desc' }
      });

      const progress = await this.query({
        table: 'user_progress',
        select: '*',
        filter: {
          user_id: userId,
          timestamp: { $gte: cutoffDate.toISOString() }
        },
        order: { timestamp: 'desc' }
      });

      const analytics = {
        totalSessions: sessions.length,
        totalTime: sessions.reduce((sum, s) => sum + (s.duration || 0), 0),
        averagePerformance: sessions.length > 0 ?
          sessions.reduce((sum, s) => sum + (s.performance_score || 0), 0) / sessions.length : 0,
        averageCognitiveLoad: sessions.length > 0 ?
          sessions.reduce((sum, s) => sum + (s.cognitive_load || 0), 0) / sessions.length : 0,
        sessionTypes: this.groupSessionsByType(sessions),
        progressMetrics: this.groupProgressByDomain(progress),
        trends: this.calculateTrends(sessions),
        timeframe
      };

      return analytics;

    } catch (error) {
      this.logger.error('Failed to get learning analytics from Supabase', error);
      return null;
    }
  }

  /**
   * Get active insights for user
   */
  public async getActiveInsights(userId: string): Promise<any[]> {
    if (!this.isInitialized) {
      throw new Error('SupabaseAdapter not initialized');
    }

    try {
      const insights = await this.query({
        table: 'insights',
        select: '*',
        filter: {
          user_id: userId,
          status: 'active',
          expires_at: { $gt: new Date().toISOString() }
        },
        order: { priority: 'desc', created_at: 'desc' }
      });

      return insights;

    } catch (error) {
      this.logger.error('Failed to get active insights from Supabase', error);
      return [];
    }
  }

  /**
   * Subscribe to real-time updates
   */
  public async subscribeToTable(
    table: string,
    filter?: string,
    callback?: (payload: any) => void
  ): Promise<string> {
    if (!this.isInitialized || !this.config.enableRealTimeSync) {
      throw new Error('SupabaseAdapter not initialized or real-time sync disabled');
    }

    try {
      const subscriptionId = `${table}_${Date.now()}`;

      const subscription: RealtimeSubscription = {
        channel: subscriptionId,
        table,
        filter,
        callback: callback || this.defaultRealtimeCallback
      };

      await this.supabaseStorage.subscribeToChanges(
        table,
        filter,
        subscription.callback
      );

      this.activeSubscriptions.set(subscriptionId, subscription);
      this.logger.info('Subscribed to real-time updates', { table, subscriptionId });

      return subscriptionId;

    } catch (error) {
      this.logger.error('Failed to subscribe to real-time updates', error);
      throw error;
    }
  }

  /**
   * Unsubscribe from real-time updates
   */
  public async unsubscribe(subscriptionId: string): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('SupabaseAdapter not initialized');
    }

    try {
      const subscription = this.activeSubscriptions.get(subscriptionId);

      if (subscription) {
        await this.supabaseStorage.unsubscribeFromChanges(subscription.table);
        this.activeSubscriptions.delete(subscriptionId);
        this.logger.info('Unsubscribed from real-time updates', { subscriptionId });
      }

    } catch (error) {
      this.logger.error('Failed to unsubscribe from real-time updates', error);
    }
  }

  /**
   * Execute Supabase function
   */
  public async executeFunction(functionName: string, params: any = {}): Promise<any> {
    if (!this.isInitialized || !this.config.enableFunctions) {
      throw new Error('SupabaseAdapter not initialized or functions disabled');
    }

    try {
      const result = await this.supabaseStorage.callFunction(functionName, params);
      this.logger.info('Supabase function executed', { functionName });

      return result.data;

    } catch (error) {
      this.logger.error('Failed to execute Supabase function', error);
      throw error;
    }
  }

  /**
   * Sync offline changes
   */
  public async syncOfflineChanges(changes: any[]): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('SupabaseAdapter not initialized');
    }

    try {
      this.logger.info('Syncing offline changes to Supabase', { count: changes.length });

      for (const change of changes) {
        switch (change.operation) {
          case 'insert':
            await this.supabaseStorage.insert(change.table, change.data);
            break;
          case 'update':
            await this.supabaseStorage.update(change.table, change.data, change.filter);
            break;
          case 'upsert':
            await this.supabaseStorage.upsert(change.table, change.data);
            break;
          case 'delete':
            await this.supabaseStorage.delete(change.table, change.filter);
            break;
        }
      }

      this.logger.info('Offline changes synced successfully');

    } catch (error) {
      this.logger.error('Failed to sync offline changes', error);
      throw error;
    }
  }

  /**
   * Get connection status
   */
  public getConnectionStatus(): 'connected' | 'connecting' | 'disconnected' {
    return this.connectionStatus;
  }

  /**
   * Force reconnection
   */
  public async reconnect(): Promise<void> {
    this.logger.info('Forcing Supabase reconnection...');

    try {
      this.connectionStatus = 'connecting';

      // Reinitialize connection
      await this.supabaseStorage.reconnect();

      // Reestablish subscriptions
      if (this.config.enableRealTimeSync) {
        await this.reestablishSubscriptions();
      }

      this.connectionStatus = 'connected';
      this.logger.info('Supabase reconnection successful');

    } catch (error) {
      this.connectionStatus = 'disconnected';
      this.logger.error('Failed to reconnect to Supabase', error);
      throw error;
    }
  }

  /**
   * Shutdown the adapter
   */
  public async shutdown(): Promise<void> {
    this.logger.info('Shutting down Supabase Adapter...');

    try {
      // Unsubscribe from all real-time subscriptions
      for (const subscriptionId of this.activeSubscriptions.keys()) {
        await this.unsubscribe(subscriptionId);
      }

      this.connectionStatus = 'disconnected';
      this.isInitialized = false;
      this.logger.info('Supabase Adapter shutdown completed');

    } catch (error) {
      this.logger.error('Supabase Adapter shutdown error', error);
    }
  }

  // Private Methods

  private async setupRealtimeSubscriptions(): Promise<void> {
    try {
      for (const channel of this.config.subscriptionChannels) {
        await this.subscribeToTable(channel, undefined, this.createChannelCallback(channel));
      }

      this.logger.info('Real-time subscriptions established', {
        channels: this.config.subscriptionChannels
      });

    } catch (error) {
      this.logger.error('Failed to setup real-time subscriptions', error);
    }
  }

  private async reestablishSubscriptions(): Promise<void> {
    const existingSubscriptions = Array.from(this.activeSubscriptions.values());
    this.activeSubscriptions.clear();

    for (const subscription of existingSubscriptions) {
      try {
        await this.subscribeToTable(
          subscription.table,
          subscription.filter,
          subscription.callback
        );
      } catch (error) {
        this.logger.warn('Failed to reestablish subscription', { table: subscription.table });
      }
    }
  }

  private createChannelCallback(channel: string): (payload: any) => void {
    return (payload: any) => {
      this.logger.debug('Received real-time update', { channel, eventType: payload.eventType });

      // Handle different types of real-time events
      switch (payload.eventType) {
        case 'INSERT':
          this.handleRealtimeInsert(channel, payload.new);
          break;
        case 'UPDATE':
          this.handleRealtimeUpdate(channel, payload.new, payload.old);
          break;
        case 'DELETE':
          this.handleRealtimeDelete(channel, payload.old);
          break;
      }
    };
  }

  private defaultRealtimeCallback = (payload: any) => {
    this.logger.debug('Default real-time callback', payload);
  };

  private handleRealtimeInsert(table: string, record: any): void {
    this.logger.debug('Handling real-time insert', { table, recordId: record.id });
    // Emit event for other parts of the system to handle
  }

  private handleRealtimeUpdate(table: string, newRecord: any, oldRecord: any): void {
    this.logger.debug('Handling real-time update', { table, recordId: newRecord.id });
    // Emit event for other parts of the system to handle
  }

  private handleRealtimeDelete(table: string, record: any): void {
    this.logger.debug('Handling real-time delete', { table, recordId: record.id });
    // Emit event for other parts of the system to handle
  }

  private calculateExpirationDate(insightType: string): string {
    const now = new Date();
    let expirationHours = 24; // Default 24 hours

    switch (insightType) {
      case 'pattern':
        expirationHours = 168; // 1 week
        break;
      case 'correlation':
        expirationHours = 72; // 3 days
        break;
      case 'prediction':
        expirationHours = 48; // 2 days
        break;
      case 'recommendation':
        expirationHours = 24; // 1 day
        break;
      case 'anomaly':
        expirationHours = 12; // 12 hours
        break;
    }

    return new Date(now.getTime() + expirationHours * 60 * 60 * 1000).toISOString();
  }

  private groupSessionsByType(sessions: any[]): Record<string, any> {
    const grouped: Record<string, any> = {};

    sessions.forEach(session => {
      const type = session.session_type || 'unknown';
      if (!grouped[type]) {
        grouped[type] = { count: 0, totalTime: 0, averagePerformance: 0 };
      }

      grouped[type].count++;
      grouped[type].totalTime += session.duration || 0;
      grouped[type].averagePerformance = (
        (grouped[type].averagePerformance * (grouped[type].count - 1)) +
        (session.performance_score || 0)
      ) / grouped[type].count;
    });

    return grouped;
  }

  private groupProgressByDomain(progress: any[]): Record<string, any> {
    const grouped: Record<string, any> = {};

    progress.forEach(p => {
      const domain = p.domain || 'unknown';
      if (!grouped[domain]) {
        grouped[domain] = {};
      }

      const metric = p.metric || 'unknown';
      if (!grouped[domain][metric]) {
        grouped[domain][metric] = { values: [], latest: null };
      }

      grouped[domain][metric].values.push({
        value: p.value,
        timestamp: p.timestamp
      });

      if (!grouped[domain][metric].latest ||
          new Date(p.timestamp) > new Date(grouped[domain][metric].latest.timestamp)) {
        grouped[domain][metric].latest = {
          value: p.value,
          timestamp: p.timestamp
        };
      }
    });

    return grouped;
  }

  private calculateTrends(sessions: any[]): any {
    // Calculate simple trends over time
    const trends = {
      performance: { direction: 'stable', change: 0 },
      cognitiveLoad: { direction: 'stable', change: 0 },
      frequency: { direction: 'stable', change: 0 }
    };

    if (sessions.length < 2) return trends;

    const sortedSessions = sessions.sort((a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    const firstHalf = sortedSessions.slice(0, Math.floor(sortedSessions.length / 2));
    const secondHalf = sortedSessions.slice(Math.floor(sortedSessions.length / 2));

    // Performance trend
    const firstHalfPerf = firstHalf.reduce((sum, s) => sum + (s.performance_score || 0), 0) / firstHalf.length;
    const secondHalfPerf = secondHalf.reduce((sum, s) => sum + (s.performance_score || 0), 0) / secondHalf.length;
    const perfChange = ((secondHalfPerf - firstHalfPerf) / firstHalfPerf) * 100;

    trends.performance.change = perfChange;
    trends.performance.direction = perfChange > 5 ? 'improving' : perfChange < -5 ? 'declining' : 'stable';

    // Similar calculations for cognitive load and frequency...

    return trends;
  }

  private getTimeframeCutoff(timeframe: string): Date {
    const now = new Date();
    const match = timeframe.match(/(\d+)([hdwmy])/);

    if (!match) return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // Default 30 days

    const [, amount, unit] = match;
    const num = parseInt(amount);

    switch (unit) {
      case 'h': return new Date(now.getTime() - num * 60 * 60 * 1000);
      case 'd': return new Date(now.getTime() - num * 24 * 60 * 60 * 1000);
      case 'w': return new Date(now.getTime() - num * 7 * 24 * 60 * 60 * 1000);
      case 'm': return new Date(now.getTime() - num * 30 * 24 * 60 * 60 * 1000);
      case 'y': return new Date(now.getTime() - num * 365 * 24 * 60 * 60 * 1000);
      default: return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  }
}

export default SupabaseAdapter;
