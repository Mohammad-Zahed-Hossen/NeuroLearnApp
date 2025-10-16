/**
 * CacheIntegrationService - Integrates SmartCacheManager with API services
 *
 * Provides centralized cache management for Todoist and Notion services
 * Handles cache invalidation, warming, and performance monitoring
 */

import { SmartCacheManager } from '../utils/SmartCacheManager';
import { TodoistService } from './integrations/TodoistService';
import NotionSyncService from './integrations/NotionSyncService';

interface CacheConfig {
  ttl: number;
  maxSize: number;
  strategy: 'lru' | 'fifo';
}

interface CacheEntry {
  key: string;
  service: 'todoist' | 'notion';
  data: any;
  timestamp: number;
  ttl: number;
}

interface CacheStats {
  todoist: {
    hits: number;
    misses: number;
    hitRate: number;
    totalRequests: number;
  };
  notion: {
    hits: number;
    misses: number;
    hitRate: number;
    totalRequests: number;
  };
  overall: {
    hits: number;
    misses: number;
    hitRate: number;
    totalRequests: number;
  };
}

export class CacheIntegrationService {
  private static instance: CacheIntegrationService;
  private cacheManager: SmartCacheManager;
  private todoistService: TodoistService;
  private notionService: NotionSyncService;
  private stats: CacheStats;
  private cacheConfigs: Map<string, CacheConfig>;

  // Cache key prefixes
  private readonly TODOIST_PREFIX = 'todoist:';
  private readonly NOTION_PREFIX = 'notion:';

  private constructor() {
    this.cacheManager = SmartCacheManager.getInstance();
    this.todoistService = TodoistService.getInstance();
    this.notionService = NotionSyncService.getInstance();

    this.stats = {
      todoist: { hits: 0, misses: 0, hitRate: 0, totalRequests: 0 },
      notion: { hits: 0, misses: 0, hitRate: 0, totalRequests: 0 },
      overall: { hits: 0, misses: 0, hitRate: 0, totalRequests: 0 }
    };

    this.cacheConfigs = new Map();

    this.initializeCacheConfigs();
    this.setupCacheInvalidation();
  }

  public static getInstance(): CacheIntegrationService {
    if (!CacheIntegrationService.instance) {
      CacheIntegrationService.instance = new CacheIntegrationService();
    }
    return CacheIntegrationService.instance;
  }

  private initializeCacheConfigs(): void {
    // Todoist cache configurations
    this.cacheConfigs.set('todoist_tasks', {
      ttl: 5 * 60 * 1000, // 5 minutes
      maxSize: 100,
      strategy: 'lru'
    });

    this.cacheConfigs.set('todoist_projects', {
      ttl: 10 * 60 * 1000, // 10 minutes
      maxSize: 50,
      strategy: 'lru'
    });

    // Notion cache configurations
    this.cacheConfigs.set('notion_pages', {
      ttl: 5 * 60 * 1000, // 5 minutes
      maxSize: 200,
      strategy: 'lru'
    });

    this.cacheConfigs.set('notion_blocks', {
      ttl: 5 * 60 * 1000, // 5 minutes
      maxSize: 500,
      strategy: 'lru'
    });

    this.cacheConfigs.set('notion_sync_stats', {
      ttl: 1 * 60 * 1000, // 1 minute
      maxSize: 10,
      strategy: 'lru'
    });
  }

  private setupCacheInvalidation(): void {
    // Cache invalidation setup - SmartCacheManager doesn't have event system
    // We'll handle invalidation directly in the methods
  }

  /**
   * Get cached Todoist tasks with automatic cache management
   */
  public async getCachedTodoistTasks(limit?: number, offset?: number): Promise<any> {
    const cacheKey = `${this.TODOIST_PREFIX}tasks_${limit || 'all'}_${offset || 0}`;

    this.stats.todoist.totalRequests++;
    this.stats.overall.totalRequests++;

    try {
      // Try to get from cache first
      const cached = await this.cacheManager.get(cacheKey);
      if (cached) {
        this.stats.todoist.hits++;
        this.stats.overall.hits++;
        console.log('✅ Todoist tasks cache hit');
        return cached;
      }

      // Cache miss - fetch from API
      this.stats.todoist.misses++;
      this.stats.overall.misses++;
      console.log('❌ Todoist tasks cache miss, fetching from API');

      const tasks = await this.todoistService.getTasks(limit, offset);

      // Cache the result
      await this.cacheManager.set(cacheKey, tasks, 'warm');

      return tasks;
    } catch (error) {
      console.error('Error in getCachedTodoistTasks:', error);
      throw error;
    }
  }

  /**
   * Get cached Todoist projects
   */
  public async getCachedTodoistProjects(): Promise<any> {
    const cacheKey = `${this.TODOIST_PREFIX}projects`;

    this.stats.todoist.totalRequests++;
    this.stats.overall.totalRequests++;

    try {
      const cached = await this.cacheManager.get(cacheKey);
      if (cached) {
        this.stats.todoist.hits++;
        this.stats.overall.hits++;
        console.log('✅ Todoist projects cache hit');
        return cached;
      }

      this.stats.todoist.misses++;
      this.stats.overall.misses++;
      console.log('❌ Todoist projects cache miss, fetching from API');

      const projects = await this.todoistService.getProjects();

      await this.cacheManager.set(cacheKey, projects, 'warm');

      return projects;
    } catch (error) {
      console.error('Error in getCachedTodoistProjects:', error);
      throw error;
    }
  }

  /**
   * Get cached Notion pages
   */
  public async getCachedNotionPages(syncType: 'full' | 'incremental' = 'incremental'): Promise<any> {
    const cacheKey = `${this.NOTION_PREFIX}pages_${syncType}`;

    this.stats.notion.totalRequests++;
    this.stats.overall.totalRequests++;

    try {
      const cached = await this.cacheManager.get(cacheKey);
      if (cached) {
        this.stats.notion.hits++;
        this.stats.overall.hits++;
        console.log('✅ Notion pages cache hit');
        return cached;
      }

      this.stats.notion.misses++;
      this.stats.overall.misses++;
      console.log('❌ Notion pages cache miss, fetching from API');

      const session = await this.notionService.syncPages(syncType);
      const pages = session.pagesSynced; // This would need to be adjusted based on actual return

      await this.cacheManager.set(cacheKey, pages, 'warm');

      return pages;
    } catch (error) {
      console.error('Error in getCachedNotionPages:', error);
      throw error;
    }
  }

  /**
   * Get cached Notion sync stats
   */
  public async getCachedNotionSyncStats(): Promise<any> {
    const cacheKey = `${this.NOTION_PREFIX}sync_stats`;

    this.stats.notion.totalRequests++;
    this.stats.overall.totalRequests++;

    try {
      const cached = await this.cacheManager.get(cacheKey);
      if (cached) {
        this.stats.notion.hits++;
        this.stats.overall.hits++;
        console.log('✅ Notion sync stats cache hit');
        return cached;
      }

      this.stats.notion.misses++;
      this.stats.overall.misses++;
      console.log('❌ Notion sync stats cache miss, fetching from API');

      const stats = await this.notionService.getSyncStats();

      await this.cacheManager.set(cacheKey, stats, 'warm');

      return stats;
    } catch (error) {
      console.error('Error in getCachedNotionSyncStats:', error);
      throw error;
    }
  }

  /**
   * Invalidate Todoist-related caches
   */
  public async invalidateTodoistCache(pattern?: string): Promise<void> {
    const fullPattern = pattern ? `${this.TODOIST_PREFIX}${pattern}` : this.TODOIST_PREFIX;
    await this.cacheManager.invalidate(fullPattern);
    console.log(`🗑️ Invalidated Todoist cache pattern: ${fullPattern}`);
  }

  /**
   * Invalidate Notion-related caches
   */
  public async invalidateNotionCache(pattern?: string): Promise<void> {
    const fullPattern = pattern ? `${this.NOTION_PREFIX}${pattern}` : this.NOTION_PREFIX;
    await this.cacheManager.invalidate(fullPattern);
    console.log(`🗑️ Invalidated Notion cache pattern: ${fullPattern}`);
  }

  /**
   * Invalidate all caches
   */
  public async invalidateAllCaches(): Promise<void> {
    await this.cacheManager.clear();
    console.log('🗑️ All caches invalidated');
  }

  /**
   * Warm up frequently accessed caches
   */
  public async warmUpCaches(): Promise<void> {
    console.log('🔥 Warming up caches...');

    try {
      // Warm up Todoist data
      await Promise.allSettled([
        this.getCachedTodoistTasks(50), // Get first 50 tasks
        this.getCachedTodoistProjects(),
      ]);

      // Warm up Notion data
      await Promise.allSettled([
        this.getCachedNotionSyncStats(),
      ]);

      console.log('✅ Cache warm-up completed');
    } catch (error) {
      console.warn('⚠️ Cache warm-up partially failed:', error);
    }
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): CacheStats {
    // Calculate hit rates
    this.stats.todoist.hitRate = this.stats.todoist.totalRequests > 0
      ? (this.stats.todoist.hits / this.stats.todoist.totalRequests) * 100
      : 0;

    this.stats.notion.hitRate = this.stats.notion.totalRequests > 0
      ? (this.stats.notion.hits / this.stats.notion.totalRequests) * 100
      : 0;

    this.stats.overall.hitRate = this.stats.overall.totalRequests > 0
      ? (this.stats.overall.hits / this.stats.overall.totalRequests) * 100
      : 0;

    return { ...this.stats };
  }

  /**
   * Reset cache statistics
   */
  public resetStats(): void {
    this.stats = {
      todoist: { hits: 0, misses: 0, hitRate: 0, totalRequests: 0 },
      notion: { hits: 0, misses: 0, hitRate: 0, totalRequests: 0 },
      overall: { hits: 0, misses: 0, hitRate: 0, totalRequests: 0 }
    };
    console.log('📊 Cache statistics reset');
  }

  /**
   * Handle cache invalidation on data mutations
   */
  public async handleDataMutation(service: 'todoist' | 'notion', operation: string, data: any): Promise<void> {
    switch (service) {
      case 'todoist':
        await this.handleTodoistMutation(operation, data);
        break;
      case 'notion':
        await this.handleNotionMutation(operation, data);
        break;
    }
  }

  private async handleTodoistMutation(operation: string, data: any): Promise<void> {
    switch (operation) {
      case 'create':
      case 'update':
      case 'delete':
        // Invalidate tasks cache
        await this.invalidateTodoistCache('tasks');
        break;
      case 'complete':
      case 'reopen':
        // Invalidate specific task cache if we had individual task caching
        if (data.taskId) {
          await this.cacheManager.delete(`${this.TODOIST_PREFIX}task_${data.taskId}`);
        }
        await this.invalidateTodoistCache('tasks');
        break;
    }
  }

  private async handleNotionMutation(operation: string, data: any): Promise<void> {
    switch (operation) {
      case 'sync':
        // Invalidate pages and blocks cache
        await this.invalidateNotionCache('pages');
        await this.invalidateNotionCache('blocks');
        await this.invalidateNotionCache('sync_stats');
        break;
      case 'push_insights':
        // Invalidate pages cache
        await this.invalidateNotionCache('pages');
        break;
    }
  }
}

export default CacheIntegrationService;
