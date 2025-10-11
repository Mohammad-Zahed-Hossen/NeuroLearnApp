/**
 * Supabase Edge Function: notion-sync-manager
 *
 * Handles server-side Notion API calls and data processing
 * Offloads heavy computation from mobile app for better performance
 *
 * Deploy: supabase functions deploy notion-sync-manager
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Client as NotionClient } from 'https://esm.sh/@notionhq/client@2.2.3';

// Types
interface SyncRequest {
  action: 'sync_pages' | 'backup_pages' | 'create_reflection' | 'validate_token';
  user_id: string;
  notion_token: string;
  sync_type?: 'full' | 'incremental';
  page_ids?: string[];
  reflection_data?: {
    type: string;
    content: string;
    metadata: any;
  };
}

interface SyncResponse {
  success: boolean;
  data?: any;
  error?: string;
  sync_session_id?: string;
  pages_processed?: number;
  blocks_processed?: number;
  links_created?: number;
}

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

// Main handler
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: SyncRequest = await req.json();
    console.log(`🔄 Processing ${requestData.action} for user ${requestData.user_id}`);

    // Validate request
    if (!requestData.user_id || !requestData.notion_token) {
      throw new Error('Missing required fields: user_id or notion_token');
    }

    // Initialize Notion client
    const notion = new NotionClient({ auth: requestData.notion_token });

    let response: SyncResponse;

    switch (requestData.action) {
      case 'validate_token':
        response = await validateNotionToken(notion, requestData.user_id);
        break;

      case 'sync_pages':
        response = await syncNotionPages(
          notion,
          supabase,
          requestData.user_id,
          requestData.sync_type || 'incremental'
        );
        break;

      case 'backup_pages':
        response = await backupNotionPages(
          notion,
          supabase,
          requestData.user_id,
          requestData.page_ids
        );
        break;

      case 'create_reflection':
        response = await createNotionReflection(
          notion,
          supabase,
          requestData.user_id,
          requestData.reflection_data!
        );
        break;

      default:
        throw new Error(`Unknown action: ${requestData.action}`);
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Edge function error:', error);

    const errorResponse: SyncResponse = {
      success: false,
  error: error instanceof Error ? error.message : String(error ?? 'Unknown error'),
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// ==============================
// TOKEN VALIDATION
// ==============================

async function validateNotionToken(
  notion: NotionClient,
  userId: string
): Promise<SyncResponse> {
  try {
    console.log('🔍 Validating Notion token...');

    const user = await notion.users.me();
    console.log('✅ Token valid for user:', user.name);

    return {
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          type: user.type,
          workspace_name: user.type === 'bot' ? user.bot?.workspace_name : 'Personal'
        }
      }
    };

  } catch (error) {
    console.error('❌ Token validation failed:', error);
    return {
      success: false,
  error: error instanceof Error ? error.message : String(error ?? 'Invalid token')
    };
  }
}

// ==============================
// PAGE SYNCHRONIZATION
// ==============================

async function syncNotionPages(
  notion: NotionClient,
  supabase: any,
  userId: string,
  syncType: 'full' | 'incremental'
): Promise<SyncResponse> {
  const syncSessionId = `session_${Date.now()}`;
  const startTime = Date.now();

  console.log(`🔄 Starting ${syncType} sync session: ${syncSessionId}`);

  try {
    // Record sync session start
    await supabase.from('notion_sync_sessions').insert({
      id: syncSessionId,
      user_id: userId,
      sync_type: syncType,
      status: 'in_progress',
      started_at: new Date().toISOString()
    });

    let pagesProcessed = 0;
    let blocksProcessed = 0;
    let linksCreated = 0;

    // Get last sync time for incremental sync
    let lastSyncTime: Date | null = null;
    if (syncType === 'incremental') {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('notion_last_sync')
        .eq('id', userId)
        .single();

      if (profile?.notion_last_sync) {
        lastSyncTime = new Date(profile.notion_last_sync);
        console.log('📅 Last sync time:', lastSyncTime.toISOString());
      }
    }

    // Sync pages in batches
    let hasMore = true;
    let cursor: string | undefined;
    const BATCH_SIZE = 50;

    while (hasMore) {
      console.log(`📄 Fetching batch (cursor: ${cursor || 'start'})...`);

      const response = await notion.search({
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
        page_size: BATCH_SIZE
      });

      for (const page of response.results) {
        if ('properties' in page && page.object === 'page') {
          // Skip if incremental and not modified since last sync
          if (lastSyncTime && new Date(page.last_edited_time) <= lastSyncTime) {
            console.log(`⏭️ Skipping unmodified page: ${page.id}`);
            continue;
          }

          // Process page
          await processNotionPage(notion, supabase, userId, page);
          pagesProcessed++;

          // Process blocks for this page
          const pageBlocksCount = await processPageBlocks(notion, supabase, userId, page.id);
          blocksProcessed += pageBlocksCount;

          console.log(`✅ Processed page: ${page.id} (${pageBlocksCount} blocks)`);
        }
      }

      hasMore = response.has_more;
      cursor = response.next_cursor || undefined;
    }

    // Create neural links from blocks
    console.log('🧠 Creating neural links...');
    linksCreated = await createNeuralLinks(supabase, userId);

    // Update sync session completion
    const syncDuration = Date.now() - startTime;

    await supabase.from('notion_sync_sessions').update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      pages_synced: pagesProcessed,
      blocks_synced: blocksProcessed,
      links_created: linksCreated,
      sync_duration_ms: syncDuration
    }).eq('id', syncSessionId);

    // Update user profile last sync time
    await supabase.from('user_profiles').update({
      notion_last_sync: new Date().toISOString()
    }).eq('id', userId);

    console.log(`✅ Sync completed in ${syncDuration}ms`);
    console.log(`   Pages: ${pagesProcessed}, Blocks: ${blocksProcessed}, Links: ${linksCreated}`);

    return {
      success: true,
      sync_session_id: syncSessionId,
      pages_processed: pagesProcessed,
      blocks_processed: blocksProcessed,
      links_created: linksCreated,
      data: {
        duration_ms: syncDuration,
        sync_type: syncType
      }
    };

  } catch (error) {
    console.error('❌ Sync failed:', error);

    // Update sync session with error
    await supabase.from('notion_sync_sessions').update({
      status: 'failed',
      completed_at: new Date().toISOString(),
  error_details: error instanceof Error ? error.message : String(error ?? 'Unknown error')
    }).eq('id', syncSessionId);

    throw error;
  }
}

// ==============================
// PAGE PROCESSING
// ==============================

async function processNotionPage(
  notion: NotionClient,
  supabase: any,
  userId: string,
  page: any
): Promise<void> {
  try {
    const pageData = {
      user_id: userId,
      notion_page_id: page.id,
      page_title: extractPageTitle(page),
      page_url: page.url || '',
      database_id: page.parent?.type === 'database_id' ? page.parent.database_id : null,
      page_type: page.parent?.type === 'database_id' ? 'database' : 'page',
      last_synced_at: new Date().toISOString(),
      last_edited_time: page.last_edited_time,
      notion_created_time: page.created_time,
      parent_id: extractParentId(page.parent),
      archived: page.archived || false,
      properties: page.properties,
      sync_status: 'synced'
    };

    // Upsert page data
    const { error } = await supabase
      .from('notion_pages')
      .upsert(pageData, { onConflict: 'user_id,notion_page_id' });

    if (error) {
      console.error('❌ Failed to store page:', error);
      throw error;
    }
  } catch (error) {
    console.error(`❌ Error processing page ${page.id}:`, error);
    throw error;
  }
}

// ==============================
// BLOCK PROCESSING
// ==============================

async function processPageBlocks(
  notion: NotionClient,
  supabase: any,
  userId: string,
  pageId: string
): Promise<number> {
  let blocksProcessed = 0;

  try {
    // Get page record from database
    const { data: pageRecord } = await supabase
      .from('notion_pages')
      .select('id')
      .eq('user_id', userId)
      .eq('notion_page_id', pageId)
      .single();

    if (!pageRecord) {
      console.error(`❌ Page record not found for ${pageId}`);
      return 0;
    }

    const dbPageId = pageRecord.id;

    // Fetch blocks recursively
    blocksProcessed = await processBlocksRecursive(
      notion,
      supabase,
      userId,
      dbPageId,
      pageId,
      0
    );

  } catch (error) {
    console.error(`❌ Error processing blocks for page ${pageId}:`, error);
  }

  return blocksProcessed;
}

async function processBlocksRecursive(
  notion: NotionClient,
  supabase: any,
  userId: string,
  dbPageId: string,
  blockId: string,
  blockOrder: number
): Promise<number> {
  let blocksProcessed = 0;
  let cursor: string | undefined;

  try {
    do {
      const response = await notion.blocks.children.list({
        block_id: blockId,
        start_cursor: cursor,
        page_size: 100
      });

      for (const block of response.results) {
        if ('type' in block) {
          // Process block data
          const blockData = {
            user_id: userId,
            notion_block_id: block.id,
            page_id: dbPageId,
            block_type: block.type,
            content_text: extractBlockText(block),
            rich_text: extractRichText(block),
            parent_block_id: block.parent?.type === 'block_id' ? block.parent.block_id : null,
            has_children: block.has_children || false,
            block_order: blockOrder++,
            properties: {},
            annotations: extractAnnotations(block),
            href: extractHref(block)
          };

          // Store block
          const { error } = await supabase
            .from('notion_blocks')
            .upsert(blockData, { onConflict: 'user_id,notion_block_id' });

          if (error) {
            console.error('❌ Failed to store block:', error);
          } else {
            blocksProcessed++;
          }

          // Process child blocks recursively
          if (block.has_children) {
            const childBlocksCount = await processBlocksRecursive(
              notion,
              supabase,
              userId,
              dbPageId,
              block.id,
              0
            );
            blocksProcessed += childBlocksCount;
          }
        }
      }

      cursor = response.next_cursor || undefined;
    } while (cursor);

  } catch (error) {
    console.error(`❌ Error processing blocks for ${blockId}:`, error);
  }

  return blocksProcessed;
}

// ==============================
// NEURAL LINK CREATION
// ==============================

async function createNeuralLinks(
  supabase: any,
  userId: string
): Promise<number> {
  let linksCreated = 0;

  try {
    // Get all blocks with content
    const { data: blocks, error } = await supabase
      .from('notion_blocks')
      .select('id, content_text, notion_block_id')
      .eq('user_id', userId)
      .not('content_text', 'is', null);

    if (error) throw error;

    // Concept pattern matching
    const CONCEPT_PATTERN = /\[\[Concept:\s*([^\]]+)\]\]/g;
    const TASK_PATTERN = /\[\[Task:\s*([^\]]+)\]\]/g;
    const SESSION_PATTERN = /\[\[Session:\s*([^\]]+)\]\]/g;

    for (const block of blocks) {
      if (!block.content_text) continue;

      // Find concept mentions
      const conceptMatches = Array.from(block.content_text.matchAll(CONCEPT_PATTERN));

      for (const match of conceptMatches) {
        const conceptName = match[1].trim();

        // Create neural link
        const linkData = {
          user_id: userId,
          notion_block_id: block.id,
          neural_node_id: conceptName, // Simplified - would need actual node lookup
          link_type: 'concept_mapping',
          confidence_score: 0.9,
          auto_linked: true,
          link_context: `Concept mentioned in Notion: "${conceptName}"`,
          notion_mention_text: match[0],
          is_active: true
        };

        const { error: linkError } = await supabase
          .from('notion_links')
          .upsert(linkData, { onConflict: 'user_id,notion_block_id,neural_node_id' });

        if (!linkError) {
          linksCreated++;
        }
      }

      // Similar processing for tasks and sessions...
    }

    console.log(`🔗 Created ${linksCreated} neural links`);

  } catch (error) {
    console.error('❌ Failed to create neural links:', error);
  }

  return linksCreated;
}

// ==============================
// BACKUP FUNCTIONALITY
// ==============================

async function backupNotionPages(
  notion: NotionClient,
  supabase: any,
  userId: string,
  pageIds?: string[]
): Promise<SyncResponse> {
  try {
    console.log('💾 Creating Notion backup...');

    const pagesData: any[] = [];

    // If specific page IDs provided, backup those; otherwise backup all
    if (pageIds && pageIds.length > 0) {
      for (const pageId of pageIds) {
        try {
          const page = await notion.pages.retrieve({ page_id: pageId });
          const blocks = await getAllBlocksForPage(notion, pageId);

          pagesData.push({
            page,
            blocks,
            retrieved_at: new Date().toISOString()
          });
        } catch (error) {
          console.warn(`⚠️ Failed to backup page ${pageId}:`, error);
        }
      }
    } else {
      // Backup all user's pages
      const { data: userPages } = await supabase
        .from('notion_pages')
        .select('notion_page_id')
        .eq('user_id', userId)
        .eq('archived', false);

      if (userPages) {
        for (const userPage of userPages.slice(0, 50)) { // Limit to 50 pages for backup
          try {
            const page = await notion.pages.retrieve({ page_id: userPage.notion_page_id });
            const blocks = await getAllBlocksForPage(notion, userPage.notion_page_id);

            pagesData.push({
              page,
              blocks,
              retrieved_at: new Date().toISOString()
            });
          } catch (error) {
            console.warn(`⚠️ Failed to backup page ${userPage.notion_page_id}:`, error);
          }
        }
      }
    }

    // Create snapshot
    const snapshot = {
      id: `backup_${Date.now()}`,
      timestamp: new Date().toISOString(),
      user_id: userId,
      total_pages: pagesData.length,
      pages: pagesData,
      metadata: {
        backup_type: 'server_generated',
        triggered_by: 'api_request',
        server_version: '1.0.0'
      }
    };

    // Store in Supabase
    const { data, error } = await supabase
      .from('notion_snapshots')
      .insert({
        user_id: userId,
        snapshot_type: 'manual',
        full_content_json: snapshot,
        file_size_bytes: JSON.stringify(snapshot).length,
        retention_until: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days
      })
      .select('id')
      .single();

    if (error) throw error;

    console.log('✅ Backup created successfully:', data.id);

    return {
      success: true,
      data: {
        snapshot_id: data.id,
        pages_backed_up: pagesData.length,
        file_size_bytes: JSON.stringify(snapshot).length
      }
    };

  } catch (error) {
    console.error('❌ Backup failed:', error);
    return {
      success: false,
  error: error instanceof Error ? error.message : String(error ?? 'Backup failed')
    };
  }
}

// ==============================
// REFLECTION CREATION
// ==============================

async function createNotionReflection(
  notion: NotionClient,
  supabase: any,
  userId: string,
  reflectionData: { type: string; content: string; metadata: any }
): Promise<SyncResponse> {
  try {
    console.log(`💡 Creating ${reflectionData.type} reflection in Notion...`);

    // Get the Cognitive Insights database ID from user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('notion_databases')
      .eq('id', userId)
      .single();

    let insightsDatabaseId: string | null = null;

    if (profile?.notion_databases) {
      const databases = profile.notion_databases;
      const insightsDb = databases.find((db: any) => db.id === 'cognitive_insights');
      insightsDatabaseId = insightsDb?.notion_id;
    }

    if (!insightsDatabaseId) {
      throw new Error('Cognitive Insights database not found or not configured');
    }

    // Create page in Notion
    const response = await notion.pages.create({
      parent: { database_id: insightsDatabaseId },
      properties: {
        'Title': {
          title: [
            {
              text: {
                content: `${reflectionData.type} - ${new Date().toLocaleDateString()}`
              }
            }
          ]
        },
        'Type': {
          select: {
            name: reflectionData.type
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
                  content: reflectionData.content
                }
              }
            ]
          }
        }
      ]
    });

    // Store in local database
    await supabase.from('notion_pages').insert({
      user_id: userId,
      notion_page_id: response.id,
      page_title: `${reflectionData.type} - ${new Date().toLocaleDateString()}`,
      page_url: response.url || '',
      page_type: 'page',
      database_id: insightsDatabaseId,
      content_preview: reflectionData.content.substring(0, 500),
      properties: reflectionData.metadata,
      sync_status: 'synced'
    });

    console.log('✅ Reflection created successfully:', response.id);

    return {
      success: true,
      data: {
        page_id: response.id,
        page_url: response.url,
        title: `${reflectionData.type} - ${new Date().toLocaleDateString()}`
      }
    };

  } catch (error) {
    console.error('❌ Failed to create reflection:', error);
    return {
      success: false,
  error: error instanceof Error ? error.message : String(error ?? 'Failed to create reflection')
    };
  }
}

// ==============================
// UTILITY FUNCTIONS
// ==============================

function extractPageTitle(page: any): string {
  try {
    if (page.properties?.title?.title?.[0]?.plain_text) {
      return page.properties.title.title[0].plain_text;
    }
    if (page.properties?.Name?.title?.[0]?.plain_text) {
      return page.properties.Name.title[0].plain_text;
    }
    return 'Untitled';
  } catch {
    return 'Untitled';
  }
}

function extractBlockText(block: any): string {
  try {
    const blockType = block.type;
    const content = block[blockType];

    if (content?.rich_text) {
      return content.rich_text.map((text: any) => text.plain_text || '').join('');
    }

    return '';
  } catch {
    return '';
  }
}

function extractRichText(block: any): any[] {
  try {
    const blockType = block.type;
    const content = block[blockType];
    return content?.rich_text || [];
  } catch {
    return [];
  }
}

function extractAnnotations(block: any): any {
  try {
    const blockType = block.type;
    const content = block[blockType];
    return content?.rich_text?.[0]?.annotations || {};
  } catch {
    return {};
  }
}

function extractHref(block: any): string | undefined {
  try {
    const blockType = block.type;
    const content = block[blockType];
    return content?.rich_text?.[0]?.href;
  } catch {
    return undefined;
  }
}

function extractParentId(parent: any): string | undefined {
  if (parent?.type === 'database_id') return parent.database_id;
  if (parent?.type === 'page_id') return parent.page_id;
  if (parent?.type === 'workspace') return 'workspace';
  return undefined;
}

async function getAllBlocksForPage(notion: NotionClient, pageId: string): Promise<any[]> {
  const allBlocks: any[] = [];
  let cursor: string | undefined;

  try {
    do {
      const response = await notion.blocks.children.list({
        block_id: pageId,
        start_cursor: cursor,
        page_size: 100
      });

      allBlocks.push(...response.results);
      cursor = response.next_cursor || undefined;
    } while (cursor);
  } catch (error) {
    console.error(`❌ Error fetching blocks for page ${pageId}:`, error);
  }

  return allBlocks;
}

console.log('🚀 Notion Sync Manager Edge Function initialized');
