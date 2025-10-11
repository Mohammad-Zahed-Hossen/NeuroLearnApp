/**
 * NotionSyncService - Core Notion Integration Service
 *
 * Handles all Notion API interactions, data synchronization, and neural linking
 * Integrates with NeuroLearn's hybrid storage system (MMKV + WatermelonDB + Supabase)
 *
 * @author NeuroLearn Team
 * @version 1.0.0
 */

import { Client as NotionClient } from '@notionhq/client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MMKVStorageService from '../storage/MMKVStorageService';
import { supabase } from '../storage/SupabaseService';
import { HybridStorageService } from '../storage/HybridStorageService';
// import { AICoachingService } from './AICoachingService'; // Commented out - file doesn't exist
import { MindMapGenerator } from '../learning/MindMapGeneratorService';
import { NOTION_CONFIG } from '../../config/integrations';

// Types
interface NotionAuthConfig {
  token: string;
  workspaceId?: string;
  workspaceName?: string;
  botId?: string;
}

interface NotionPage {
  id: string;
  title: string;
  url: string;
  databaseId?: string;
  pageType: 'page' | 'database';
  lastEditedTime: string;
  createdTime: string;
  parentId?: string;
  archived: boolean;
  properties: any;
  contentPreview?: string;
}

interface NotionBlock {
  id: string;
  pageId: string;
  blockType: string;
  contentText: string;
  richText: any[];
  parentBlockId?: string;
  hasChildren: boolean;
  blockOrder: number;
  properties: any;
  annotations: any;
  href?: string;
}

interface NotionLink {
  notionBlockId: string;
  neuralNodeId: string;
  linkType: 'concept_mapping' | 'flashcard_source' | 'task_reference' | 'session_summary';
  confidenceScore: number;
  autoLinked: boolean;
  linkContext: string;
  mentionText: string;
}

interface SyncSession {
  id: string;
  syncType: 'full' | 'incremental' | 'pages_only' | 'blocks_only';
  startedAt: Date;
  completedAt?: Date;
  status: 'in_progress' | 'completed' | 'failed' | 'cancelled';
  pagesSynced: number;
  blocksSynced: number;
  linksCreated: number;
  errorDetails?: string;
  syncDurationMs?: number;
}

interface SyncStats {
  totalPages: number;
  totalBlocks: number;
  totalLinks: number;
  lastSync?: Date;
  syncStatus: 'current' | 'pending' | 'stale';
  pendingChanges: number;
  successfulSyncsToday: number;
}

export class NotionSyncService {
  private static instance: NotionSyncService;
  private notionClient: NotionClient | null = null;
  // Use the async-safe MMKVStorageService wrapper (falls back to AsyncStorage)
  private storage = MMKVStorageService;
  private storageService: HybridStorageService;
  // private aiCoachingService: AICoachingService; // Commented out - service doesn't exist
  private mindMapService: MindMapGenerator;
  private syncInProgress = false;

  // Cache for frequently accessed data
  private pageCache = new Map<string, NotionPage>();
  private blockCache = new Map<string, NotionBlock[]>();

  // Connection & small-hot-cache values kept in-memory for sync-friendly reads
  private connected = false;
  private workspaceId?: string | null = null;
  private workspaceName?: string | null = null;
  private cachedPageCount = 0;
  private cachedBlockCount = 0;
  private cachedLastSync?: number | null = null;

  // Configuration
  private readonly SYNC_BATCH_SIZE = 50;
  private readonly MAX_CONTENT_PREVIEW_LENGTH = 500;
  private readonly CONCEPT_PATTERN = /\[\[Concept:\s*([^\]]+)\]\]/g;
  private readonly TASK_PATTERN = /\[\[Task:\s*([^\]]+)\]\]/g;
  private readonly SESSION_PATTERN = /\[\[Session:\s*([^\]]+)\]\]/g;

  private constructor() {
    this.storageService = HybridStorageService.getInstance();
    // this.aiCoachingService = AICoachingService.getInstance(); // Commented out - service doesn't exist
    this.mindMapService = MindMapGenerator.getInstance();

    // Load cached values from the async wrapper. Don't await in constructor;
    // initializeFromCache is async and will populate in background.
    this.initializeFromCache();
  }

  public static getInstance(): NotionSyncService {
    if (!NotionSyncService.instance) {
      NotionSyncService.instance = new NotionSyncService();
    }
    return NotionSyncService.instance;
  }

  // ==============================
  // CORE PUBLIC METHODS
  // ==============================

  /**
   * Exchange OAuth authorization code for access token
   */
  public async exchangeOAuthCode(code: string): Promise<{ success: boolean; token?: string; error?: string }> {
    try {
      console.log('🔄 Exchanging OAuth code for token...');

      // Notion OAuth token exchange endpoint
      const response = await fetch(NOTION_CONFIG.TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${btoa(NOTION_CONFIG.CLIENT_ID + ':' + NOTION_CONFIG.CLIENT_SECRET)}`
        },
        body: JSON.stringify({
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: NOTION_CONFIG.REDIRECT_URI
        })
      });

      if (!response.ok) {
        throw new Error(`OAuth token exchange failed: ${response.status}`);
      }

      const data = await response.json();

      if (data.access_token) {
        console.log('✅ OAuth token exchanged successfully');
        return { success: true, token: data.access_token };
      } else {
        throw new Error('No access token in response');
      }

    } catch (error) {
      console.error('❌ OAuth code exchange failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown OAuth error'
      };
    }
  }

  /**
   * Connect to Notion using OAuth token
   * Stores authentication securely in MMKV
   */
  public async connectToNotion(token: string): Promise<{ success: boolean; workspace?: any; error?: string }> {
    try {
      console.log('🔗 Connecting to Notion...');

      // Initialize Notion client
      this.notionClient = new NotionClient({ auth: token });

      // Verify connection by getting user info
      const user = await this.notionClient.users.me({});
      console.log('✅ Connected to Notion as:', user.name);

      // Get workspace info
      const workspace = user.type === 'bot' ? 'Bot Workspace' : 'Personal';

      // Store auth info securely in MMKV
      const authConfig: NotionAuthConfig = {
        token,
        workspaceId: user.id,
        workspaceName: workspace || 'Notion Workspace',
        botId: user.type === 'bot' ? user.id : undefined
      };

      // Persist via storage wrapper (async)
      await this.storage.setItem('notion.authToken', token);
      await this.storage.setItem('notion.workspaceId', authConfig.workspaceId || '');
      await this.storage.setItem('notion.workspaceName', authConfig.workspaceName || '');
      await this.storage.setItem('notion.lastSync', String(Date.now()));
      await this.storage.setItem('notion.connectionStatus', 'connected');

      // Update in-memory cached values used by synchronous callers
      this.connected = true;
      this.workspaceId = authConfig.workspaceId || null;
      this.workspaceName = authConfig.workspaceName || null;
      this.cachedLastSync = Date.now();

      // Update user profile in Supabase
      await this.updateUserProfile({
        notion_token: token,
        notion_workspace_id: authConfig.workspaceId,
        notion_workspace_name: authConfig.workspaceName,
        notion_last_sync: new Date().toISOString()
      });

      // Initialize default databases
      await this.setupDefaultDatabases();

      console.log('🎉 Notion integration successfully configured!');

      return {
        success: true,
        workspace: {
          id: authConfig.workspaceId,
          name: authConfig.workspaceName,
          botId: authConfig.botId
        }
      };

    } catch (error) {
      console.error('❌ Failed to connect to Notion:', error);

  // Clear any partial auth data
  await this.storage.removeItem('notion.authToken');
  await this.storage.setItem('notion.connectionStatus', 'error');
  this.connected = false;

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown connection error'
      };
    }
  }

  /**
   * Sync pages and blocks from Notion
   * Main synchronization method with incremental support
   */
  public async syncPages(syncType: 'full' | 'incremental' = 'incremental'): Promise<SyncSession> {
    if (this.syncInProgress) {
      throw new Error('Sync already in progress');
    }

    if (!this.notionClient) {
      throw new Error('Not connected to Notion. Call connectToNotion() first.');
    }

    const sessionId = `sync_${Date.now()}`;
    this.syncInProgress = true;

    console.log(`🔄 Starting ${syncType} sync session: ${sessionId}`);

    const syncSession: SyncSession = {
      id: sessionId,
      syncType,
      startedAt: new Date(),
      status: 'in_progress',
      pagesSynced: 0,
      blocksSynced: 0,
      linksCreated: 0
    };

    try {
      // Record sync session start
      await this.recordSyncSession(syncSession);

      const startTime = Date.now();

      // Step 1: Sync pages
      console.log('📄 Syncing pages...');
      const pages = await this.syncNotionPages(syncType);
      syncSession.pagesSynced = pages.length;

      // Step 2: Sync blocks for each page
      console.log('📦 Syncing blocks...');
      let totalBlocks = 0;

      for (const page of pages) {
        const blocks = await this.syncPageBlocks(page.id);
        totalBlocks += blocks.length;

        // Add to block cache
        this.blockCache.set(page.id, blocks);
      }

      syncSession.blocksSynced = totalBlocks;

      // Step 3: Parse and create neural links
      console.log('🧠 Creating neural links...');
      const linksCreated = await this.parseBlocksToMindNodes();
      syncSession.linksCreated = linksCreated;

      // Step 4: Update cache and complete session
      syncSession.completedAt = new Date();
      syncSession.status = 'completed';
      syncSession.syncDurationMs = Date.now() - startTime;

      // Update MMKV cache
  // Persist updated counters via async storage wrapper
  await this.storage.setItem('notion.lastSync', String(Date.now()));
  await this.storage.setItem('notion.pageCount', String(syncSession.pagesSynced));
  await this.storage.setItem('notion.blockCount', String(syncSession.blocksSynced));

  // Update cached values
  this.cachedLastSync = Date.now();
  this.cachedPageCount = syncSession.pagesSynced;
  this.cachedBlockCount = syncSession.blocksSynced;

      // Record completion
      await this.recordSyncSession(syncSession);

      console.log(`✅ Sync completed in ${syncSession.syncDurationMs}ms`);
      console.log(`   Pages: ${syncSession.pagesSynced}, Blocks: ${syncSession.blocksSynced}, Links: ${syncSession.linksCreated}`);

      return syncSession;

    } catch (error) {
      console.error('❌ Sync failed:', error);

      syncSession.completedAt = new Date();
      syncSession.status = 'failed';
      syncSession.errorDetails = error instanceof Error ? error.message : 'Unknown sync error';

      await this.recordSyncSession(syncSession);

      throw error;

    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Parse blocks and create links to MindMap nodes
   * Core AI linking intelligence
   */
  public async parseBlocksToMindNodes(): Promise<number> {
    console.log('🔍 Parsing blocks for neural links...');

    let linksCreated = 0;

    try {
      // Get all blocks from database
      const { data: blocks, error } = await supabase
        .from('notion_blocks')
        .select('id, content_text, notion_block_id, page_id')
        .not('content_text', 'is', null);

      if (error) throw error;

      // Get current mind map nodes for matching
      const neuralGraph = await this.mindMapService.generateNeuralGraph();
      const nodeMap = new Map(neuralGraph.nodes.map((node: any) => [node.label.toLowerCase(), node.id]));

      for (const block of blocks) {
        if (!block.content_text) continue;

        // Extract concept mentions using patterns
        const conceptMatches = Array.from(block.content_text.matchAll(this.CONCEPT_PATTERN));
        const taskMatches = Array.from(block.content_text.matchAll(this.TASK_PATTERN));
        const sessionMatches = Array.from(block.content_text.matchAll(this.SESSION_PATTERN));

        // Process concept links
        for (const match of conceptMatches) {
          const conceptName = (match as RegExpMatchArray)[1].trim();
          const normalizedConcept = conceptName.toLowerCase();

          // Find matching neural node
          let nodeId = nodeMap.get(normalizedConcept);

          // Try fuzzy matching if exact match not found
          if (!nodeId) {
            nodeId = await this.findBestNodeMatch(conceptName, Array.from(nodeMap.keys()) as string[]);
          }

          if (nodeId) {
            const link: NotionLink = {
              notionBlockId: block.id,
              neuralNodeId: nodeId as string,
              linkType: 'concept_mapping',
              confidenceScore: 0.9, // High confidence for explicit mentions
              autoLinked: true,
              linkContext: `Concept mentioned in Notion: "${conceptName}"`,
              mentionText: (match as RegExpMatchArray)[0]
            };

            await this.createNotionLink(link);
            linksCreated++;
          }
        }

        // Process task links (similar logic)
        for (const match of taskMatches) {
          // Implementation similar to concepts but for tasks
          // Would link to TodoistService tasks if available
        }

        // Process session links
        for (const match of sessionMatches) {
          // Link to focus sessions, reading sessions, etc.
        }
      }

      console.log(`🔗 Created ${linksCreated} neural links`);
      return linksCreated;

    } catch (error) {
      console.error('❌ Failed to parse blocks for neural links:', error);
      return linksCreated;
    }
  }

  /**
   * Push AI insights and reflections to Notion
   * Creates new pages in the "Cognitive Insights" database
   */
  public async pushInsightsToNotion(
    insightType: string,
    content: string,
    metadata: any = {}
  ): Promise<{ success: boolean; pageId?: string; error?: string }> {
    if (!this.notionClient) {
      return { success: false, error: 'Not connected to Notion' };
    }

    try {
      console.log(`💡 Pushing ${insightType} insight to Notion...`);

      // Get the Cognitive Insights database ID
      const insightsDatabaseId = await this.getCognitiveInsightsDatabaseId();
      if (!insightsDatabaseId) {
        return { success: false, error: 'Cognitive Insights database not found' };
      }

      // Create page in Notion
      const response = await this.notionClient.pages.create({
        parent: { database_id: insightsDatabaseId },
        properties: {
          'Title': {
            title: [
              {
                text: {
                  content: `${insightType} - ${new Date().toLocaleDateString()}`
                }
              }
            ]
          },
          'Type': {
            select: {
              name: insightType
            }
          },
          'Generated': {
            date: {
              start: new Date().toISOString()
            }
          }
        },
        children: [
          {
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [
                {
                  type: 'text',
                  text: {
                    content: content
                  }
                }
              ]
            }
          }
        ]
      });

      // Store in local database
      await this.storeNotionPage({
        id: response.id,
        title: `${insightType} - ${new Date().toLocaleDateString()}`,
        url: `https://notion.so/${response.id}`,
        pageType: 'page',
        databaseId: insightsDatabaseId,
        lastEditedTime: new Date().toISOString(),
        createdTime: new Date().toISOString(),
        archived: false,
        properties: metadata,
        contentPreview: content.substring(0, this.MAX_CONTENT_PREVIEW_LENGTH)
      });

      console.log('✅ Insight successfully pushed to Notion');

      return { success: true, pageId: response.id };

    } catch (error) {
      console.error('❌ Failed to push insight to Notion:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Backup data to Supabase cold storage
   * Creates comprehensive snapshots for rollback capability
   */
  public async backupToSupabase(): Promise<{ success: boolean; snapshotId?: string; error?: string }> {
    try {
      console.log('💾 Creating Supabase backup...');

      // Get all pages with full content
      const pages = await this.getAllPagesWithContent();

      const snapshot = {
        id: `snapshot_${Date.now()}`,
        timestamp: new Date().toISOString(),
        totalPages: pages.length,
        fullContent: pages,
        metadata: {
          backupType: 'manual',
          triggerReason: 'user_requested',
          appVersion: '1.0.0'
        }
      };

      // Store in Supabase
      const { data, error } = await supabase
        .from('notion_snapshots')
        .insert({
          snapshot_type: 'manual',
          full_content_json: snapshot,
          file_size_bytes: JSON.stringify(snapshot).length,
          retention_until: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days
        })
        .select('id')
        .single();

      if (error) throw error;

      console.log('✅ Backup created successfully:', data.id);

      return { success: true, snapshotId: data.id };

    } catch (error) {
      console.error('❌ Backup failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown backup error'
      };
    }
  }

  // ==============================
  // SYNC STATS & STATUS METHODS
  // ==============================

  /**
   * Get comprehensive sync statistics for dashboard
   */
  public async getSyncStats(): Promise<SyncStats> {
    try {
      // Get stats from Supabase function. Prefer v2 which fixes an ambiguity bug
      // and returns `sync_status_text`. Fall back to the older RPC name when
      // the new function isn't available (for older DBs).
      let data: any;
      let error: any = null;

      try {
        const resp = await supabase.rpc('get_notion_sync_stats_v2', {
          p_user_id: (await supabase.auth.getUser()).data.user?.id
        });
        // Supabase JS returns an object with { data, error }
        data = (resp as any).data;
        error = (resp as any).error;
      } catch (e) {
        // Try the legacy RPC if v2 doesn't exist
        const resp = await supabase.rpc('get_notion_sync_stats', {
          p_user_id: (await supabase.auth.getUser()).data.user?.id
        });
        data = (resp as any).data;
        error = (resp as any).error;
      }

      if (error) throw error;

      const stats = data[0] || {
        total_pages: 0,
        total_blocks: 0,
        total_links: 0,
        last_sync: null,
        sync_status_text: 'stale',
        pending_changes: 0,
        successful_syncs_today: 0
      };

      // The SQL function was updated to return `sync_status_text` to avoid
      // ambiguous column references in PL/pgSQL. For backwards compatibility
      // accept sync_status_text only.
      const syncStatusValue = stats.sync_status_text ?? 'stale';

      return {
        totalPages: stats.total_pages,
        totalBlocks: stats.total_blocks,
        totalLinks: stats.total_links,
        lastSync: stats.last_sync ? new Date(stats.last_sync) : undefined,
        syncStatus: syncStatusValue,
        pendingChanges: stats.pending_changes,
        successfulSyncsToday: stats.successful_syncs_today
      };

    } catch (error) {
      console.error('❌ Failed to get sync stats:', error);

      // Fallback to async storage wrapper values (best-effort)
      try {
        const p = await this.storage.getItem('notion.pageCount');
        const b = await this.storage.getItem('notion.blockCount');
        const ls = await this.storage.getItem('notion.lastSync');

        return {
          totalPages: p ? parseInt(p, 10) || 0 : this.cachedPageCount || 0,
          totalBlocks: b ? parseInt(b, 10) || 0 : this.cachedBlockCount || 0,
          totalLinks: 0,
          lastSync: ls ? new Date(Number(ls)) : this.cachedLastSync ? new Date(this.cachedLastSync) : undefined,
          syncStatus: 'stale',
          pendingChanges: 0,
          successfulSyncsToday: 0
        };
      } catch (inner) {
        return {
          totalPages: this.cachedPageCount || 0,
          totalBlocks: this.cachedBlockCount || 0,
          totalLinks: 0,
          lastSync: this.cachedLastSync ? new Date(this.cachedLastSync) : undefined,
          syncStatus: 'stale',
          pendingChanges: 0,
          successfulSyncsToday: 0
        };
      }
    }
  }

  /**
   * Get neural links for mind map visualization
   */
  public async getNeuralLinks(): Promise<Array<{
    neuralNodeId: string;
    notionPageTitle: string;
    notionPageUrl: string;
    linkCount: number;
    confidenceAvg: number;
    lastUpdated: Date;
  }>> {
    try {
      const { data, error } = await supabase
        .rpc('get_notion_neural_links', {
          p_user_id: (await supabase.auth.getUser()).data.user?.id
        });

      if (error) throw error;

      return data.map((link: any) => ({
        neuralNodeId: link.neural_node_id,
        notionPageTitle: link.notion_page_title,
        notionPageUrl: link.notion_page_url,
        linkCount: link.link_count,
        confidenceAvg: link.confidence_avg,
        lastUpdated: new Date(link.last_updated)
      }));

    } catch (error) {
      console.error('❌ Failed to get neural links:', error);
      return [];
    }
  }

  /**
   * Check connection status
   */
  public isConnected(): boolean {
    // Return the cached connection state (populated from storage on init or after connect)
    return this.connected && this.notionClient !== null;
  }

  /**
   * Get workspace information
   */
  public async getWorkspaceInfo(): Promise<any> {
    if (!this.notionClient) {
      throw new Error('Notion client not initialized');
    }

    try {
      const user = await this.notionClient.users.me({});
      return {
        id: user.id,
        name: user.name || 'Unknown',
        type: user.type,
        avatarUrl: user.avatar_url,
      };
    } catch (error) {
      throw new Error(`Failed to get workspace info: ${error}`);
    }
  }

  // ==============================
  // PRIVATE HELPER METHODS
  // ==============================

  private async initializeFromCache(): Promise<void> {
    try {
      const token = await this.storage.getItem('notion.authToken');
      if (token) {
        try {
          this.notionClient = new NotionClient({ auth: token });
          console.log('✅ Restored Notion connection from cache');
          this.connected = true;
        } catch (error) {
          console.warn('⚠️ Failed to restore Notion connection:', error);
          await this.storage.removeItem('notion.authToken');
          this.connected = false;
        }
      }

      // Load workspace metadata
      const wid = await this.storage.getItem('notion.workspaceId');
      const wname = await this.storage.getItem('notion.workspaceName');
      const pcount = await this.storage.getItem('notion.pageCount');
      const bcount = await this.storage.getItem('notion.blockCount');
      const ls = await this.storage.getItem('notion.lastSync');

      this.workspaceId = wid || null;
      this.workspaceName = wname || null;
      this.cachedPageCount = pcount ? parseInt(pcount, 10) || 0 : 0;
      this.cachedBlockCount = bcount ? parseInt(bcount, 10) || 0 : 0;
      this.cachedLastSync = ls ? Number(ls) : null;
    } catch (err) {
      console.warn('⚠️ initializeFromCache failed:', err);
    }
  }

  private async syncNotionPages(syncType: 'full' | 'incremental'): Promise<NotionPage[]> {
    if (!this.notionClient) throw new Error('Notion client not initialized');

    const pages: NotionPage[] = [];
    let cursor: string | undefined;

    // Get last sync time for incremental sync
    const lastSyncStr = await this.storage.getItem('notion.lastSync');
    const lastSyncTime = syncType === 'incremental' && lastSyncStr ? Number(lastSyncStr) : undefined;

    do {
      const response = await this.notionClient.search({
        query: '',
        filter: {
          property: 'object',
          value: 'page'
        },
        sort: {
          direction: 'descending',
          timestamp: 'last_edited_time'
        },
        start_cursor: cursor,
        page_size: this.SYNC_BATCH_SIZE
      });

      for (const page of response.results) {
        if ('properties' in page && page.object === 'page') {
          // Skip if incremental and not modified since last sync
          if (lastSyncTime && new Date(page.last_edited_time).getTime() <= lastSyncTime) {
            continue;
          }

          const notionPage: NotionPage = {
            id: page.id,
            title: this.extractPageTitle(page),
            url: page.url || '',
            pageType: page.parent?.type === 'database_id' ? 'database' : 'page',
            databaseId: page.parent?.type === 'database_id' ? page.parent.database_id : undefined,
            lastEditedTime: page.last_edited_time,
            createdTime: page.created_time,
            parentId: this.extractParentId(page.parent),
            archived: page.archived || false,
            properties: page.properties,
            contentPreview: '' // Will be filled when syncing blocks
          };

          pages.push(notionPage);

          // Store in local database
          await this.storeNotionPage(notionPage);

          // Add to cache
          this.pageCache.set(page.id, notionPage);
        }
      }

      cursor = response.next_cursor || undefined;

    } while (cursor);

    return pages;
  }

  private async syncPageBlocks(pageId: string): Promise<NotionBlock[]> {
    if (!this.notionClient) throw new Error('Notion client not initialized');

    const blocks: NotionBlock[] = [];
    let cursor: string | undefined;
    let blockOrder = 0;

    do {
      const response = await this.notionClient.blocks.children.list({
        block_id: pageId,
        start_cursor: cursor,
        page_size: this.SYNC_BATCH_SIZE
      });

      for (const block of response.results) {
        if ('type' in block) {
          const notionBlock: NotionBlock = {
            id: block.id,
            pageId,
            blockType: block.type,
            contentText: this.extractBlockText(block),
            richText: this.extractRichText(block),
            parentBlockId: undefined, // Parent property not available in this block type
            hasChildren: block.has_children || false,
            blockOrder: blockOrder++,
            properties: {},
            annotations: this.extractAnnotations(block),
            href: this.extractHref(block)
          };

          blocks.push(notionBlock);

          // Store in local database
          await this.storeNotionBlock(notionBlock);

          // Recursively sync child blocks if they exist
          if (block.has_children) {
            const childBlocks = await this.syncPageBlocks(block.id);
            blocks.push(...childBlocks);
          }
        }
      }

      cursor = response.next_cursor || undefined;

    } while (cursor);

    return blocks;
  }

  private async storeNotionPage(page: NotionPage): Promise<void> {
    const { data: userResp } = await supabase.auth.getUser();
    const userId = userResp?.user?.id;
    if (!userId) {
      console.error('❌ No authenticated user found');
      return;
    }

    const { error } = await supabase
      .from('notion_pages')
      .upsert({
        user_id: userId,
        notion_page_id: page.id,
        page_title: page.title,
        page_url: page.url,
        database_id: page.databaseId,
        page_type: page.pageType,
        last_synced_at: new Date().toISOString(),
        last_edited_time: page.lastEditedTime,
        notion_created_time: page.createdTime,
        parent_id: page.parentId,
        archived: page.archived,
        properties: page.properties,
        content_preview: page.contentPreview,
        sync_status: 'synced'
      });

    if (error) {
      console.error('❌ Failed to store Notion page:', error);
    }
  }

  private async storeNotionBlock(block: NotionBlock): Promise<void> {
    const { data: userResp } = await supabase.auth.getUser();
    const userId = userResp?.user?.id;
    if (!userId) {
      console.error('❌ No authenticated user found');
      return;
    }

    const { error } = await supabase
      .from('notion_blocks')
      .upsert({
        user_id: userId,
        notion_block_id: block.id,
        page_id: block.pageId,
        block_type: block.blockType,
        content_text: block.contentText,
        rich_text: block.richText,
        parent_block_id: block.parentBlockId,
        has_children: block.hasChildren,
        block_order: block.blockOrder,
        properties: block.properties,
        annotations: block.annotations,
        href: block.href
      });

    if (error) {
      console.error('❌ Failed to store Notion block:', error);
    }
  }

  private async createNotionLink(link: NotionLink): Promise<void> {
    const { data: userResp } = await supabase.auth.getUser();
    const userId = userResp?.user?.id;
    if (!userId) {
      console.error('❌ No authenticated user found');
      return;
    }

    const { error } = await supabase
      .from('notion_links')
      .upsert({
        user_id: userId,
        notion_block_id: link.notionBlockId,
        neural_node_id: link.neuralNodeId,
        link_type: link.linkType,
        confidence_score: link.confidenceScore,
        auto_linked: link.autoLinked,
        link_context: link.linkContext,
        notion_mention_text: link.mentionText,
        is_active: true
      });

    if (error) {
      console.error('❌ Failed to create Notion link:', error);
    }
  }

  // Additional helper methods for text extraction, fuzzy matching, etc.
  private extractPageTitle(page: any): string {
    try {
      if (page.properties?.title?.title?.[0]?.plain_text) {
        return page.properties.title.title[0].plain_text;
      }
      if (page.properties?.Name?.title?.[0]?.plain_text) {
        return page.properties.Name.title[0].plain_text;
      }
      return 'Untitled';
    } catch (error) {
      return 'Untitled';
    }
  }

  private extractBlockText(block: any): string {
    try {
      const blockType = block.type;
      const content = block[blockType];

      if (content?.rich_text) {
        return content.rich_text.map((text: any) => text.plain_text || '').join('');
      }

      return '';
    } catch (error) {
      return '';
    }
  }

  private extractRichText(block: any): any[] {
    try {
      const blockType = block.type;
      const content = block[blockType];
      return content?.rich_text || [];
    } catch (error) {
      return [];
    }
  }

  private extractAnnotations(block: any): any {
    try {
      const blockType = block.type;
      const content = block[blockType];
      return content?.rich_text?.[0]?.annotations || {};
    } catch (error) {
      return {};
    }
  }

  private extractHref(block: any): string | undefined {
    try {
      const blockType = block.type;
      const content = block[blockType];
      return content?.rich_text?.[0]?.href;
    } catch (error) {
      return undefined;
    }
  }

  private extractParentId(parent: any): string | undefined {
    if (parent?.type === 'database_id') return parent.database_id;
    if (parent?.type === 'page_id') return parent.page_id;
    if (parent?.type === 'workspace') return 'workspace';
    return undefined;
  }

  private async findBestNodeMatch(
    conceptName: string,
    nodeLabels: string[],
    nodeMap?: Map<string, string>
  ): Promise<string | null> {
    // Simple fuzzy matching - could be enhanced with more sophisticated algorithms
    const normalizedConcept = conceptName.toLowerCase();

    // First try substring matches
    for (const label of nodeLabels) {
      const l = label.toLowerCase();
      if (l.includes(normalizedConcept) || normalizedConcept.includes(l)) {
        // If a nodeMap was provided, resolve label -> id
        if (nodeMap && nodeMap.has(label)) return nodeMap.get(label)!;
        return label;
      }
    }

    // Fallback: token intersection scoring
    const targetTokens = new Set(normalizedConcept.split(/\s+/).filter(Boolean));
    let bestScore = 0;
    let bestLabel: string | null = null;

    for (const label of nodeLabels) {
      const tokens = label.toLowerCase().split(/\s+/).filter(Boolean);
      let common = 0;
      for (const t of tokens) if (targetTokens.has(t)) common++;
      if (common > bestScore) {
        bestScore = common;
        bestLabel = label;
      }
    }

    if (bestLabel) {
      if (nodeMap && nodeMap.has(bestLabel)) return nodeMap.get(bestLabel)!;
      return bestLabel;
    }

    return null;
  }

  // More helper methods implemented with conservative behaviour to avoid destructive changes
  private async recordSyncSession(session: SyncSession): Promise<void> {
    try {
      await supabase
        .from('notion_sync_sessions')
        .insert({
          session_id: session.id,
          sync_type: session.syncType,
          started_at: session.startedAt.toISOString(),
          completed_at: session.completedAt ? session.completedAt.toISOString() : null,
          status: session.status,
          pages_synced: session.pagesSynced,
          blocks_synced: session.blocksSynced,
          links_created: session.linksCreated,
          error_details: session.errorDetails || null,
          sync_duration_ms: session.syncDurationMs || null,
        })
        .select();
    } catch (error) {
      console.warn('⚠️ recordSyncSession failed:', error);
    }
  }

  private async updateUserProfile(updates: any): Promise<void> {
    try {
      const { data: userResp } = await supabase.auth.getUser();
      const userId = userResp?.user?.id;
      if (!userId) return;

      // Use upsert to not overwrite unrelated fields unintentionally
      await supabase
        .from('user_profiles')
        .upsert({ id: userId, ...updates })
        .select();
    } catch (error) {
      console.warn('⚠️ updateUserProfile failed:', error);
    }
  }

  private async setupDefaultDatabases(): Promise<void> {
    try {
      const { data: userResp } = await supabase.auth.getUser();
      const userId = userResp?.user?.id;
      if (!userId) {
        console.warn('⚠️ setupDefaultDatabases skipped: No authenticated user');
        return;
      }

      // Check for presence of expected DBs and create lightweight placeholders if missing.
      const expected = ['Daily Learning Log', 'Focus Tracker', 'Cognitive Insights', 'Action Items'];

      const { data: existing } = await supabase
        .from('notion_pages')
        .select('notion_page_id, page_title')
        .in('page_title', expected as any[])
        .eq('user_id', userId);

      const existingTitles = new Set((existing || []).map((p: any) => p.page_title));

      for (const title of expected) {
        if (!existingTitles.has(title)) {
          // Insert a minimal placeholder record so UI and other code can reference it
          await supabase.from('notion_pages').insert({
            user_id: userId,
            notion_page_id: `placeholder_${title.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}`,
            page_title: title,
            page_url: null,
            database_id: null,
            page_type: 'database',
            last_synced_at: new Date().toISOString(),
            last_edited_time: new Date().toISOString(),
            notion_created_time: new Date().toISOString(),
            parent_id: null,
            archived: false,
            properties: {},
            content_preview: '',
            sync_status: 'placeholder'
          });
        }
      }
    } catch (error) {
      console.warn('⚠️ setupDefaultDatabases failed:', error);
    }
  }

  private async getCognitiveInsightsDatabaseId(): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('notion_pages')
        .select('notion_page_id, page_title, page_type')
        .ilike('page_title', 'Cognitive Insights')
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (data && data.notion_page_id) return data.notion_page_id;
      return null;
    } catch (error) {
      console.warn('⚠️ getCognitiveInsightsDatabaseId failed:', error);
      return null;
    }
  }

  private async getAllPagesWithContent(): Promise<any[]> {
    try {
      const { data: pages } = await supabase
        .from('notion_pages')
        .select('*');

      if (!pages || pages.length === 0) return [];

      // Fetch blocks for pages in batches to avoid huge responses
      const result: any[] = [];
      for (const p of pages) {
        const { data: blocks } = await supabase
          .from('notion_blocks')
          .select('*')
          .eq('page_id', p.id);

        result.push({ ...p, blocks: blocks || [] });
      }

      return result;
    } catch (error) {
      console.warn('⚠️ getAllPagesWithContent failed:', error);
      return [];
    }
  }

  /**
   * Test connection to Notion API
   */
  public async testConnection(): Promise<void> {
    if (!this.notionClient) {
      throw new Error('Notion client not initialized');
    }

    try {
      // Use /users/me endpoint as it's lightweight and tests auth
      await this.notionClient.users.me({});
    } catch (error) {
      throw new Error(`Notion connection failed: ${error}`);
    }
  }

  /**
   * Check connection and measure latency
   */
  public async checkConnectionAndLatency(): Promise<number> {
    const startTime = Date.now();
    await this.testConnection();
    return Date.now() - startTime;
  }

  /**
   * Get workspace information
   */

  public async isTokenValid(): Promise<boolean> {
    try {
      await this.testConnection();
      return true;
    } catch {
      return false;
    }
  }
}

export default NotionSyncService;
