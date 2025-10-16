/**
 * NotionAdapter - Notion Integration Adapter
 *
 * Adapter for integrating with Notion API to sync learning data,
 * tasks, notes, and knowledge management with the NeuroLearn ecosystem.
 */

import { Logger } from '../utils/Logger';
import NotionSyncService from '../../services/integrations/NotionSyncCompat';

export interface NotionPage {
  id: string;
  title: string;
  content: any;
  properties: Record<string, any>;
  database?: string;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
}

export interface NotionDatabase {
  id: string;
  title: string;
  properties: Record<string, any>;
  pages: NotionPage[];
}

export interface NotionSyncConfig {
  enableAutoSync: boolean;
  syncInterval: number; // minutes
  syncDatabases: string[];
  enableRealTimeUpdates: boolean;
  conflictResolution: 'local' | 'remote' | 'merge';
}

/**
 * Notion Adapter
 *
 * Provides unified access to Notion workspace for knowledge management.
 */
export class NotionAdapter {
  private logger: Logger;
  private notionSyncService: any;
  private config: NotionSyncConfig;

  private isInitialized = false;
  private syncTimer: NodeJS.Timeout | null = null;
  private connectedDatabases: Map<string, NotionDatabase> = new Map();

  constructor(config?: Partial<NotionSyncConfig>) {
    this.logger = new Logger('NotionAdapter');
    this.config = {
      enableAutoSync: true,
      syncInterval: 30, // 30 minutes
      syncDatabases: [],
      enableRealTimeUpdates: true,
      conflictResolution: 'merge',
      ...config
    };
  }

  /**
   * Initialize the Notion adapter
   */
  public async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing Notion Adapter...');

      // Initialize Notion sync service
      this.notionSyncService = NotionSyncService.getInstance();
      await this.notionSyncService.initialize();

      // Setup databases
      await this.setupDatabases();

      // Start auto-sync if enabled
      if (this.config.enableAutoSync) {
        this.startAutoSync();
      }

      this.isInitialized = true;
      this.logger.info('Notion Adapter initialized successfully');

    } catch (error) {
      this.logger.error('Failed to initialize Notion Adapter', error);
      throw error;
    }
  }

  /**
   * Sync learning session data to Notion
   */
  public async syncLearningSession(sessionData: any): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('NotionAdapter not initialized');
    }

    try {
      const notionPage: NotionPage = {
        id: '',
        title: `Learning Session - ${new Date().toLocaleDateString()}`,
        content: {
          type: 'learning_session',
          data: sessionData
        },
        properties: {
          'Session Type': { select: { name: sessionData.type || 'General' } },
          'Duration': { number: sessionData.duration || 0 },
          'Performance': { number: sessionData.performance || 0 },
          'Cognitive Load': { number: sessionData.cognitiveLoad || 0 },
          'Date': { date: { start: sessionData.timestamp || new Date().toISOString() } },
          'Tags': { multi_select: (sessionData.tags || []).map((tag: string) => ({ name: tag })) }
        },
        database: 'learning_sessions',
        createdAt: new Date(),
        updatedAt: new Date(),
        tags: sessionData.tags || []
      };

      await this.createPage(notionPage);
      this.logger.info('Learning session synced to Notion', { sessionId: sessionData.id });

    } catch (error) {
      this.logger.error('Failed to sync learning session to Notion', error);
      throw error;
    }
  }

  /**
   * Sync flashcard decks to Notion
   */
  public async syncFlashcardDeck(deckData: any): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('NotionAdapter not initialized');
    }

    try {
      // Create deck page
      const deckPage: NotionPage = {
        id: '',
        title: deckData.name,
        content: {
          type: 'flashcard_deck',
          description: deckData.description,
          cards: deckData.cards
        },
        properties: {
          'Deck Name': { title: [{ text: { content: deckData.name } }] },
          'Card Count': { number: deckData.cards?.length || 0 },
          'Category': { select: { name: deckData.category || 'General' } },
          'Difficulty': { select: { name: deckData.difficulty || 'Medium' } },
          'Created Date': { date: { start: new Date().toISOString() } }
        },
        database: 'flashcard_decks',
        createdAt: new Date(),
        updatedAt: new Date(),
        tags: deckData.tags || []
      };

      await this.createPage(deckPage);

      // Create individual card pages if needed
      if (deckData.cards && this.config.syncDatabases.includes('flashcards')) {
        for (const card of deckData.cards) {
          await this.syncFlashcard(card, deckData.id);
        }
      }

    } catch (error) {
      this.logger.error('Failed to sync flashcard deck to Notion', error);
      throw error;
    }
  }

  /**
   * Sync mind map to Notion
   */
  public async syncMindMap(mindMapData: any): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('NotionAdapter not initialized');
    }

    try {
      const mindMapPage: NotionPage = {
        id: '',
        title: mindMapData.title || 'Mind Map',
        content: {
          type: 'mind_map',
          nodes: mindMapData.nodes,
          connections: mindMapData.connections,
          layout: mindMapData.layout
        },
        properties: {
          'Topic': { title: [{ text: { content: mindMapData.title || 'Untitled' } }] },
          'Node Count': { number: mindMapData.nodes?.length || 0 },
          'Connections': { number: mindMapData.connections?.length || 0 },
          'Created Date': { date: { start: new Date().toISOString() } },
          'Subject': { select: { name: mindMapData.subject || 'General' } }
        },
        database: 'mind_maps',
        createdAt: new Date(),
        updatedAt: new Date(),
        tags: mindMapData.tags || []
      };

      await this.createPage(mindMapPage);

    } catch (error) {
      this.logger.error('Failed to sync mind map to Notion', error);
      throw error;
    }
  }

  /**
   * Create or update knowledge base entry
   */
  public async syncKnowledge(knowledgeData: any): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('NotionAdapter not initialized');
    }

    try {
      const knowledgePage: NotionPage = {
        id: knowledgeData.notionId || '',
        title: knowledgeData.title,
        content: {
          type: 'knowledge',
          content: knowledgeData.content,
          references: knowledgeData.references,
          connections: knowledgeData.connections
        },
        properties: {
          'Title': { title: [{ text: { content: knowledgeData.title } }] },
          'Category': { select: { name: knowledgeData.category || 'General' } },
          'Confidence': { number: knowledgeData.confidence || 0 },
          'Last Reviewed': { date: { start: knowledgeData.lastReviewed?.toISOString() || new Date().toISOString() } },
          'Source': { rich_text: [{ text: { content: knowledgeData.source || 'NeuroLearn' } }] }
        },
        database: 'knowledge_base',
        createdAt: new Date(),
        updatedAt: new Date(),
        tags: knowledgeData.tags || []
      };

      if (knowledgeData.notionId) {
        await this.updatePage(knowledgePage);
      } else {
        const createdPage = await this.createPage(knowledgePage);
        knowledgeData.notionId = createdPage.id;
      }

    } catch (error) {
      this.logger.error('Failed to sync knowledge to Notion', error);
      throw error;
    }
  }

  /**
   * Get learning data from Notion
   */
  public async getLearningData(timeframe: string = '30d'): Promise<any[]> {
    if (!this.isInitialized) {
      throw new Error('NotionAdapter not initialized');
    }

    try {
      const database = this.connectedDatabases.get('learning_sessions');
      if (!database) {
        this.logger.warn('Learning sessions database not connected');
        return [];
      }

      const cutoffDate = this.getTimeframeCutoff(timeframe);

      const pages = await this.notionSyncService.queryDatabase(database.id, {
        filter: {
          property: 'Date',
          date: {
            after: cutoffDate.toISOString()
          }
        },
        sorts: [
          {
            property: 'Date',
            direction: 'descending'
          }
        ]
      });

      return pages;

    } catch (error) {
      this.logger.error('Failed to get learning data from Notion', error);
      return [];
    }
  }

  /**
   * Search Notion workspace
   */
  public async search(query: string, options: any = {}): Promise<NotionPage[]> {
    if (!this.isInitialized) {
      throw new Error('NotionAdapter not initialized');
    }

    try {
      const results = await this.notionSyncService.search(query, options);
      return results.map(this.mapToNotionPage);

    } catch (error) {
      this.logger.error('Failed to search Notion workspace', error);
      return [];
    }
  }

  /**
   * Force synchronization with Notion
   */
  public async forceSync(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('NotionAdapter not initialized');
    }

    try {
      this.logger.info('Starting forced Notion synchronization...');

      // Sync each connected database
      for (const [databaseId, database] of this.connectedDatabases) {
        await this.syncDatabase(database);
      }

      this.logger.info('Forced Notion synchronization completed');

    } catch (error) {
      this.logger.error('Failed to force sync with Notion', error);
      throw error;
    }
  }

  /**
   * Shutdown the adapter
   */
  public async shutdown(): Promise<void> {
    this.logger.info('Shutting down Notion Adapter...');

    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }

    this.isInitialized = false;
    this.logger.info('Notion Adapter shutdown completed');
  }

  // Private Methods

  private async setupDatabases(): Promise<void> {
    // Setup default databases for NeuroLearn data
    const defaultDatabases = [
      'learning_sessions',
      'flashcard_decks',
      'flashcards',
      'mind_maps',
      'knowledge_base'
    ];

    for (const dbName of defaultDatabases) {
      try {
        const database = await this.notionSyncService.getOrCreateDatabase(dbName, this.getDatabaseSchema(dbName));
        this.connectedDatabases.set(dbName, database);
        this.logger.info(`Connected to Notion database: ${dbName}`);
      } catch (error) {
        this.logger.warn(`Failed to setup database ${dbName}`, error);
      }
    }
  }

  private startAutoSync(): void {
    this.syncTimer = setInterval(async () => {
      try {
        await this.performAutoSync();
      } catch (error) {
        this.logger.warn('Auto-sync failed', error);
      }
    }, this.config.syncInterval * 60 * 1000);
  }

  private async performAutoSync(): Promise<void> {
    this.logger.debug('Performing automatic Notion sync...');

    // Sync modified databases
    for (const [databaseId, database] of this.connectedDatabases) {
      await this.syncDatabase(database);
    }
  }

  private async syncDatabase(database: NotionDatabase): Promise<void> {
    // Implementation would sync database changes
    // This is a simplified version
    this.logger.debug(`Syncing database: ${database.title}`);
  }

  private async createPage(page: NotionPage): Promise<NotionPage> {
    const database = this.connectedDatabases.get(page.database || '');
    if (!database) {
      throw new Error(`Database not found: ${page.database}`);
    }

    const createdPage = await this.notionSyncService.createPage(database.id, {
      properties: page.properties,
      children: this.contentToBlocks(page.content)
    });

    return {
      ...page,
      id: createdPage.id,
      createdAt: new Date(createdPage.created_time),
      updatedAt: new Date(createdPage.last_edited_time)
    };
  }

  private async updatePage(page: NotionPage): Promise<NotionPage> {
    const updatedPage = await this.notionSyncService.updatePage(page.id, {
      properties: page.properties
    });

    return {
      ...page,
      updatedAt: new Date(updatedPage.last_edited_time)
    };
  }

  private async syncFlashcard(card: any, deckId: string): Promise<void> {
    const cardPage: NotionPage = {
      id: '',
      title: `Card: ${card.front?.substring(0, 50) || 'Untitled'}`,
      content: {
        type: 'flashcard',
        front: card.front,
        back: card.back,
        difficulty: card.difficulty
      },
      properties: {
        'Front': { rich_text: [{ text: { content: card.front || '' } }] },
        'Back': { rich_text: [{ text: { content: card.back || '' } }] },
        'Deck': { relation: [{ id: deckId }] },
        'Difficulty': { select: { name: card.difficulty || 'Medium' } },
        'Next Review': { date: { start: card.nextReview?.toISOString() || new Date().toISOString() } }
      },
      database: 'flashcards',
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: card.tags || []
    };

    await this.createPage(cardPage);
  }

  private getDatabaseSchema(databaseName: string): Record<string, any> {
    const schemas: Record<string, any> = {
      learning_sessions: {
        'Session Type': { select: { options: [{ name: 'Flashcards' }, { name: 'Mind Map' }, { name: 'Focus' }] } },
        'Duration': { number: {} },
        'Performance': { number: {} },
        'Cognitive Load': { number: {} },
        'Date': { date: {} },
        'Tags': { multi_select: {} }
      },
      flashcard_decks: {
        'Deck Name': { title: {} },
        'Card Count': { number: {} },
        'Category': { select: {} },
        'Difficulty': { select: {} },
        'Created Date': { date: {} }
      },
      flashcards: {
        'Front': { rich_text: {} },
        'Back': { rich_text: {} },
        'Deck': { relation: { database_id: '' } },
        'Difficulty': { select: {} },
        'Next Review': { date: {} }
      },
      mind_maps: {
        'Topic': { title: {} },
        'Node Count': { number: {} },
        'Connections': { number: {} },
        'Created Date': { date: {} },
        'Subject': { select: {} }
      },
      knowledge_base: {
        'Title': { title: {} },
        'Category': { select: {} },
        'Confidence': { number: {} },
        'Last Reviewed': { date: {} },
        'Source': { rich_text: {} }
      }
    };

    return schemas[databaseName] || {};
  }

  private contentToBlocks(content: any): any[] {
    // Convert content to Notion blocks format
    if (typeof content === 'string') {
      return [{
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{ type: 'text', text: { content } }]
        }
      }];
    }

    // Handle structured content
    return [{
      object: 'block',
      type: 'code',
      code: {
        rich_text: [{
          type: 'text',
          text: { content: JSON.stringify(content, null, 2) }
        }],
        language: 'json'
      }
    }];
  }

  private mapToNotionPage(notionResult: any): NotionPage {
    return {
      id: notionResult.id,
      title: this.extractTitle(notionResult.properties),
      content: notionResult.children || {},
      properties: notionResult.properties,
      createdAt: new Date(notionResult.created_time),
      updatedAt: new Date(notionResult.last_edited_time),
      tags: this.extractTags(notionResult.properties)
    };
  }

  private extractTitle(properties: any): string {
    for (const [key, prop] of Object.entries(properties)) {
      if ((prop as any).type === 'title' && (prop as any).title?.length > 0) {
        return (prop as any).title[0].text.content;
      }
    }
    return 'Untitled';
  }

  private extractTags(properties: any): string[] {
    for (const [key, prop] of Object.entries(properties)) {
      if ((prop as any).type === 'multi_select') {
        return (prop as any).multi_select.map((tag: any) => tag.name);
      }
    }
    return [];
  }

  private getTimeframeCutoff(timeframe: string): Date {
    const now = new Date();
    const match = timeframe.match(/(\d+)([hdwmy])/);

    if (!match) return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // Default 30 days

    const [, amount, unit] = match;
  const num = parseInt(String(amount ?? '0'));

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

export default NotionAdapter;
