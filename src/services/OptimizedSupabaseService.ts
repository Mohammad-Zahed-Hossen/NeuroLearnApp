/**
 * Optimized Supabase Service
 *
 * Extends the base SupabaseService with advanced optimizations:
 * - Singleton with request queuing and rate limiting
 * - Batch fetching capabilities
 * - Optimized connection pooling and health checks
 */

import { SupabaseClient, User } from '@supabase/supabase-js';
import SupabaseService from './storage/SupabaseService';

// Types for request queuing
interface QueuedRequest {
  id: string;
  priority: 'high' | 'medium' | 'low';
  operation: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (error: any) => void;
  retries: number;
  timestamp: number;
}

// Types for batch operations
interface BatchQuery {
  table: string;
  operation: 'select' | 'insert' | 'update' | 'delete';
  data?: any;
  filters?: Record<string, any>;
  resolve: (value: any) => void;
  reject: (error: any) => void;
}

export class OptimizedSupabaseService {
  private static instance: OptimizedSupabaseService;
  private baseService: SupabaseService;
  private client: SupabaseClient;

  // Request queuing
  private requestQueue: QueuedRequest[] = [];
  private activeRequests = 0;
  private maxConcurrentRequests = 5;
  private rateLimitDelay = 100; // ms between requests
  private lastRequestTime = 0;

  // Batch fetching
  private batchQueue: BatchQuery[] = [];
  private batchSize = 10;
  private batchTimeout = 100; // ms to wait before processing batch

  // Connection pooling
  private connectionPool: SupabaseClient[] = [];
  private maxPoolSize = 3;
  private healthCheckInterval: NodeJS.Timeout | undefined;

  private constructor() {
    this.baseService = SupabaseService.getInstance();
    this.client = this.baseService.getClient();

    // Initialize connection pool
    this.initializeConnectionPool();

    // Start health checks
    this.startHealthChecks();

    // Process queues
    this.processRequestQueue();
    this.processBatchQueue();
  }

  public static getInstance(): OptimizedSupabaseService {
    if (!OptimizedSupabaseService.instance) {
      OptimizedSupabaseService.instance = new OptimizedSupabaseService();
    }
    return OptimizedSupabaseService.instance;
  }

  // ==================== CONNECTION POOLING ====================

  private initializeConnectionPool(): void {
    for (let i = 0; i < this.maxPoolSize; i++) {
      // Create additional clients for pooling (though Supabase client handles connection internally)
      // For optimization, we can reuse the same client but simulate pooling
      this.connectionPool.push(this.client);
    }
  }

  private getPooledClient(): SupabaseClient {
    // Simple round-robin for demonstration; in practice, Supabase handles this
    const client = this.connectionPool.shift();
    if (client) {
      this.connectionPool.push(client);
      return client;
    }
    return this.client; // Fallback
  }

  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(async () => {
      try {
        if (this.baseService.checkConnectionHealth) {
          await this.baseService.checkConnectionHealth();
          console.log('🔗 Supabase connection healthy');
        }
      } catch (error) {
        console.error('🔗 Supabase connection unhealthy:', error);
        // Could implement reconnection logic here
      }
    }, 30000); // Check every 30 seconds
  }

  // ==================== REQUEST QUEUING ====================

  private async processRequestQueue(): Promise<void> {
    while (true) {
      if (this.activeRequests >= this.maxConcurrentRequests) {
        await new Promise(resolve => setTimeout(resolve, 50));
        continue;
      }

      const now = Date.now();
      if (now - this.lastRequestTime < this.rateLimitDelay) {
        await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay - (now - this.lastRequestTime)));
      }

      const request = this.getNextRequest();
      if (!request) {
        await new Promise(resolve => setTimeout(resolve, 100));
        continue;
      }

      this.activeRequests++;
      this.lastRequestTime = Date.now();

      try {
        const result = await request.operation();
        request.resolve(result);
      } catch (error) {
        if (request.retries > 0) {
          request.retries--;
          // Re-queue with backoff
          setTimeout(() => {
            this.requestQueue.unshift(request);
          }, Math.pow(2, 3 - request.retries) * 1000);
        } else {
          request.reject(error);
        }
      } finally {
        this.activeRequests--;
      }
    }
  }

  private getNextRequest(): QueuedRequest | null {
    // Sort by priority and timestamp
    this.requestQueue.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.timestamp - b.timestamp;
    });

    return this.requestQueue.shift() || null;
  }

  private queueRequest(
    operation: () => Promise<any>,
    priority: 'high' | 'medium' | 'low' = 'medium',
    retries: number = 3
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const request: QueuedRequest = {
        id: Math.random().toString(36).substr(2, 9),
        priority,
        operation,
        resolve,
        reject,
        retries,
        timestamp: Date.now(),
      };
      this.requestQueue.push(request);
    });
  }

  // ==================== BATCH FETCHING ====================

  private async processBatchQueue(): Promise<void> {
    setInterval(async () => {
      if (this.batchQueue.length === 0) return;

      const batch = this.batchQueue.splice(0, this.batchSize);
      const grouped = this.groupBatchQueries(batch);

      for (const [table, queries] of Object.entries(grouped)) {
        try {
          const results = await this.executeBatch(table, queries);
          // Resolve individual promises
          queries.forEach((query, index) => {
            query.resolve(results[index]);
          });
        } catch (error) {
          queries.forEach(query => query.reject(error));
        }
      }
    }, this.batchTimeout);
  }

  private groupBatchQueries(queries: BatchQuery[]): Record<string, BatchQuery[]> {
    const grouped: Record<string, BatchQuery[]> = {};
    queries.forEach(query => {
      if (!grouped[query.table]) grouped[query.table] = [];
      // TS: ensure non-undefined before pushing
      grouped[query.table]!.push(query);
    });
    return grouped;
  }

  private async executeBatch(table: string, queries: BatchQuery[]): Promise<any[]> {
    // For simplicity, execute each query; in practice, combine into single RPC or batch
    const results = await Promise.all(
      queries.map(async query => {
        const client = this.getPooledClient();
        switch (query.operation) {
          case 'select':
            return client.from(table).select('*').match(query.filters || {});
          case 'insert':
            return client.from(table).insert(query.data);
          case 'update':
            return client.from(table).update(query.data).match(query.filters || {});
          case 'delete':
            return client.from(table).delete().match(query.filters || {});
          default:
            throw new Error(`Unsupported operation: ${query.operation}`);
        }
      })
    );
    return results;
  }

  public async batchSelect(table: string, filters: Record<string, any>): Promise<any> {
    return new Promise((resolve, reject) => {
      this.batchQueue.push({
        table,
        operation: 'select',
        filters,
        resolve,
        reject,
      });
    });
  }

  public async batchInsert(table: string, data: any): Promise<any> {
    return new Promise((resolve, reject) => {
      this.batchQueue.push({
        table,
        operation: 'insert',
        data,
        resolve,
        reject,
      });
    });
  }

  // ==================== PUBLIC API ====================

  // Delegate auth methods to base service
  public async getCurrentUser(): Promise<User | null> {
    return this.baseService.getCurrentUser();
  }

  public async signIn(email: string, password: string): Promise<{ user: User | null; error: any }> {
    return this.queueRequest(() => this.baseService.signIn(email, password), 'high');
  }

  public async signOut(): Promise<{ error: any }> {
    return this.queueRequest(() => this.baseService.signOut(), 'high');
  }

  // Optimized data methods
  public async getFlashcards(): Promise<{ data: any[] | null; error: any }> {
    return this.queueRequest(() => this.baseService.getFlashcards(), 'medium');
  }

  public async saveFlashcard(flashcard: any): Promise<{ error: any }> {
    return this.queueRequest(() => this.baseService.saveFlashcard(flashcard), 'medium');
  }

  // Batch example
  public async batchGetFlashcards(userIds: string[]): Promise<any[]> {
    const promises = userIds.map(userId =>
      this.batchSelect('flashcards', { user_id: userId })
    );
    return Promise.all(promises);
  }

  // Cleanup
  public destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }
  }
}

export default OptimizedSupabaseService;
