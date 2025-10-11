-- ==============================
-- Notion Integration Tables - NeuroLearn Enhancement
-- Schema extension for Notion sync and knowledge bridge
-- ==============================

-- ==============================
-- 1. Notion Pages (Warm Tier - WatermelonDB)
-- ==============================

CREATE TABLE IF NOT EXISTS public.notion_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE,
  notion_page_id TEXT NOT NULL UNIQUE, -- Notion's page ID
  page_title TEXT NOT NULL,
  page_url TEXT,
  database_id TEXT, -- Parent database ID if applicable
  page_type TEXT DEFAULT 'page' CHECK (page_type IN ('page', 'database')),
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  last_edited_time TIMESTAMPTZ,
  notion_created_time TIMESTAMPTZ,
  parent_id TEXT, -- Parent page/database ID
  archived BOOLEAN DEFAULT false,
  properties JSONB DEFAULT '{}', -- Notion page properties
  content_preview TEXT, -- First 500 chars for quick display
  is_template BOOLEAN DEFAULT false,
  sync_status TEXT DEFAULT 'synced' CHECK (sync_status IN ('synced', 'pending', 'error')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(user_id, notion_page_id)
);

-- ==============================
-- 2. Notion Blocks (Warm Tier - WatermelonDB)
-- ==============================

CREATE TABLE IF NOT EXISTS public.notion_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE,
  notion_block_id TEXT NOT NULL,
  page_id uuid REFERENCES public.notion_pages(id) ON DELETE CASCADE,
  block_type TEXT NOT NULL, -- paragraph, heading_1, code, etc.
  content_text TEXT, -- Plain text content
  rich_text JSONB DEFAULT '[]', -- Notion's rich text format
  parent_block_id TEXT, -- For nested blocks
  has_children BOOLEAN DEFAULT false,
  block_order INTEGER DEFAULT 0, -- Order within parent
  properties JSONB DEFAULT '{}', -- Block-specific properties
  annotations JSONB DEFAULT '{}', -- Bold, italic, code, etc.
  href TEXT, -- For link blocks
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(user_id, notion_block_id)
);

-- ==============================
-- 3. Notion Links (Neural Connection Bridge)
-- ==============================

CREATE TABLE IF NOT EXISTS public.notion_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE,
  notion_block_id uuid REFERENCES public.notion_blocks(id) ON DELETE CASCADE,
  neural_node_id TEXT NOT NULL, -- References MindMap node ID
  link_type TEXT DEFAULT 'concept_mapping' CHECK (link_type IN ('concept_mapping', 'flashcard_source', 'task_reference', 'session_summary')),
  confidence_score REAL DEFAULT 0.8 CHECK (confidence_score >= 0 AND confidence_score <= 1),
  auto_linked BOOLEAN DEFAULT true, -- If created by AI or manually
  link_context TEXT, -- Why this link was created
  notion_mention_text TEXT, -- The [[Concept: ...]] text that created the link
  last_validated_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(user_id, notion_block_id, neural_node_id)
);

-- ==============================
-- 4. Notion Sync Status (Hot Tier - MMKV metadata)
-- This table tracks sync sessions and status
-- ==============================

CREATE TABLE IF NOT EXISTS public.notion_sync_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE,
  sync_type TEXT DEFAULT 'full' CHECK (sync_type IN ('full', 'incremental', 'pages_only', 'blocks_only')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'failed', 'cancelled')),
  pages_synced INTEGER DEFAULT 0,
  blocks_synced INTEGER DEFAULT 0,
  links_created INTEGER DEFAULT 0,
  error_details TEXT,
  sync_duration_ms INTEGER,
  workspace_id TEXT,
  workspace_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================
-- 5. Notion Snapshots (Cold Tier - Supabase)
-- Full page backups for rollback capability
-- ==============================

CREATE TABLE IF NOT EXISTS public.notion_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE,
  page_id uuid REFERENCES public.notion_pages(id) ON DELETE SET NULL,
  notion_page_id TEXT NOT NULL,
  snapshot_type TEXT DEFAULT 'scheduled' CHECK (snapshot_type IN ('scheduled', 'manual', 'pre_sync', 'rollback')),
  full_content_json JSONB NOT NULL, -- Complete page structure
  metadata JSONB DEFAULT '{}',
  file_size_bytes INTEGER,
  compression_used BOOLEAN DEFAULT false,
  retention_until TIMESTAMPTZ, -- When to auto-delete
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================
-- 6. Enhanced User Profiles - Notion Settings
-- Add Notion-specific fields to existing user_profiles table
-- ==============================

-- Add columns for Notion integration to existing user_profiles
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS notion_workspace_id TEXT,
ADD COLUMN IF NOT EXISTS notion_workspace_name TEXT,
ADD COLUMN IF NOT EXISTS notion_auto_sync_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notion_sync_interval_minutes INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS notion_last_sync TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS notion_databases JSONB DEFAULT '[]', -- Array of connected databases
ADD COLUMN IF NOT EXISTS notion_sync_preferences JSONB DEFAULT '{
  "syncReadingSessions": true,
  "syncFocusMetrics": true,
  "syncAIInsights": true,
  "syncTasks": false,
  "createDailyNotes": true,
  "autoLinkConcepts": true
}',
ADD COLUMN IF NOT EXISTS notion_link_patterns JSONB DEFAULT '{
  "conceptPattern": "[[Concept: %s]]",
  "taskPattern": "[[Task: %s]]",
  "sessionPattern": "[[Session: %s]]"
}';

-- ==============================
-- 7. Enable Row Level Security
-- ==============================

ALTER TABLE public.notion_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notion_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notion_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notion_sync_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notion_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage own notion pages"
ON public.notion_pages FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own notion blocks"
ON public.notion_blocks FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own notion links"
ON public.notion_links FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own sync sessions"
ON public.notion_sync_sessions FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own snapshots"
ON public.notion_snapshots FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ==============================
-- 8. Performance Indexes
-- ==============================

-- Notion Pages Indexes
CREATE INDEX IF NOT EXISTS idx_notion_pages_user_id ON public.notion_pages(user_id);
CREATE INDEX IF NOT EXISTS idx_notion_pages_notion_id ON public.notion_pages(notion_page_id);
CREATE INDEX IF NOT EXISTS idx_notion_pages_last_synced ON public.notion_pages(last_synced_at);
CREATE INDEX IF NOT EXISTS idx_notion_pages_database_id ON public.notion_pages(database_id);
CREATE INDEX IF NOT EXISTS idx_notion_pages_sync_status ON public.notion_pages(sync_status);

-- Notion Blocks Indexes
CREATE INDEX IF NOT EXISTS idx_notion_blocks_user_id ON public.notion_blocks(user_id);
CREATE INDEX IF NOT EXISTS idx_notion_blocks_page_id ON public.notion_blocks(page_id);
CREATE INDEX IF NOT EXISTS idx_notion_blocks_notion_id ON public.notion_blocks(notion_block_id);
CREATE INDEX IF NOT EXISTS idx_notion_blocks_parent_id ON public.notion_blocks(parent_block_id);
CREATE INDEX IF NOT EXISTS idx_notion_blocks_order ON public.notion_blocks(page_id, block_order);

-- Notion Links Indexes
CREATE INDEX IF NOT EXISTS idx_notion_links_user_id ON public.notion_links(user_id);
CREATE INDEX IF NOT EXISTS idx_notion_links_neural_node ON public.notion_links(neural_node_id);
CREATE INDEX IF NOT EXISTS idx_notion_links_block_id ON public.notion_links(notion_block_id);
CREATE INDEX IF NOT EXISTS idx_notion_links_type ON public.notion_links(link_type);
CREATE INDEX IF NOT EXISTS idx_notion_links_active ON public.notion_links(is_active);

-- Sync Sessions Indexes
CREATE INDEX IF NOT EXISTS idx_sync_sessions_user_id ON public.notion_sync_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_sessions_started_at ON public.notion_sync_sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_sync_sessions_status ON public.notion_sync_sessions(status);

-- Snapshots Indexes
CREATE INDEX IF NOT EXISTS idx_notion_snapshots_user_id ON public.notion_snapshots(user_id);
CREATE INDEX IF NOT EXISTS idx_notion_snapshots_page_id ON public.notion_snapshots(page_id);
CREATE INDEX IF NOT EXISTS idx_notion_snapshots_retention ON public.notion_snapshots(retention_until);

-- Full-text search on content
CREATE INDEX IF NOT EXISTS idx_notion_blocks_content_search ON public.notion_blocks USING gin(to_tsvector('english', content_text));

-- ==============================
-- 9. Helper Functions
-- ==============================

-- Function: Get sync statistics for dashboard
CREATE OR REPLACE FUNCTION public.get_notion_sync_stats(p_user_id uuid)
RETURNS TABLE (
  total_pages INTEGER,
  total_blocks INTEGER,
  total_links INTEGER,
  last_sync TIMESTAMPTZ,
  sync_status_text TEXT,
  pending_changes INTEGER,
  successful_syncs_today INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- total pages (only non-archived pages for the user)
    (SELECT COUNT(*)::INTEGER FROM public.notion_pages np WHERE np.user_id = p_user_id AND np.archived = false),
    -- total blocks for the user
    (SELECT COUNT(*)::INTEGER FROM public.notion_blocks nb WHERE nb.user_id = p_user_id),
    -- total active links for the user
    (SELECT COUNT(*)::INTEGER FROM public.notion_links nl WHERE nl.user_id = p_user_id AND nl.is_active = true),
    -- last sync timestamp from user profile
    up.notion_last_sync,
    -- calculate a clear sync status; check most-recent state first
    CASE
      WHEN up.notion_last_sync IS NULL THEN 'stale'
      WHEN up.notion_last_sync >= NOW() - INTERVAL '30 minutes' THEN 'current'
      WHEN up.notion_last_sync >= NOW() - INTERVAL '1 hour' THEN 'pending'
      ELSE 'stale'
    END AS sync_status_text,
    -- pending changes (pages marked pending)
    (SELECT COUNT(*)::INTEGER FROM public.notion_pages np2 WHERE np2.user_id = p_user_id AND np2.sync_status = 'pending'),
    -- successful sync sessions today
    (SELECT COUNT(*)::INTEGER FROM public.notion_sync_sessions nss
     WHERE nss.user_id = p_user_id
       AND nss.status = 'completed'
       AND nss.started_at >= date_trunc('day', NOW()))
  FROM public.user_profiles up
  WHERE up.id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get linked concepts for neural map visualization
CREATE OR REPLACE FUNCTION public.get_notion_neural_links(p_user_id uuid)
RETURNS TABLE (
  neural_node_id TEXT,
  notion_page_title TEXT,
  notion_page_url TEXT,
  link_count INTEGER,
  confidence_avg REAL,
  last_updated TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    nl.neural_node_id,
    np.page_title,
    np.page_url,
    COUNT(*)::INTEGER as link_count,
    AVG(nl.confidence_score)::REAL as confidence_avg,
    MAX(nl.updated_at) as last_updated
  FROM public.notion_links nl
  JOIN public.notion_blocks nb ON nl.notion_block_id = nb.id
  JOIN public.notion_pages np ON nb.page_id = np.id
  WHERE nl.user_id = p_user_id
    AND nl.is_active = true
    AND NOT np.archived
  GROUP BY nl.neural_node_id, np.page_title, np.page_url
  ORDER BY link_count DESC, confidence_avg DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Create AI reflection entry
CREATE OR REPLACE FUNCTION public.create_notion_reflection(
  p_user_id uuid,
  p_session_type TEXT,
  p_reflection_text TEXT,
  p_metrics JSONB DEFAULT '{}'
) RETURNS uuid AS $$
DECLARE
  reflection_id uuid;
BEGIN
  -- This would integrate with your NotionSyncService to create actual Notion page
  INSERT INTO public.notion_pages (user_id, notion_page_id, page_title, content_preview, page_type)
  VALUES (
    p_user_id,
    'local_' || gen_random_uuid()::text, -- Temporary local ID until synced
    p_session_type || ' Reflection - ' || to_char(NOW(), 'YYYY-MM-DD HH24:MI'),
    left(p_reflection_text, 500),
    'page'
  )
  RETURNING id INTO reflection_id;

  -- Create a block for the content
  INSERT INTO public.notion_blocks (user_id, notion_block_id, page_id, block_type, content_text)
  VALUES (
    p_user_id,
    'local_' || gen_random_uuid()::text,
    reflection_id,
    'paragraph',
    p_reflection_text
  );

  RETURN reflection_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================
-- 10. Automatic Cleanup Jobs
-- ==============================

-- Function: Clean up old snapshots
CREATE OR REPLACE FUNCTION public.cleanup_notion_snapshots()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.notion_snapshots
  WHERE retention_until < NOW()
     OR (retention_until IS NULL AND created_at < NOW() - INTERVAL '90 days');

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================
-- 11. Triggers for Auto-Updates
-- ==============================

-- Update timestamp trigger for notion_pages
CREATE OR REPLACE FUNCTION public.update_notion_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER trigger_notion_pages_updated_at
  BEFORE UPDATE ON public.notion_pages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_notion_timestamp();

CREATE TRIGGER trigger_notion_blocks_updated_at
  BEFORE UPDATE ON public.notion_blocks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_notion_timestamp();

CREATE TRIGGER trigger_notion_links_updated_at
  BEFORE UPDATE ON public.notion_links
  FOR EACH ROW
  EXECUTE FUNCTION public.update_notion_timestamp();

-- ==============================
-- 12. Initial Data Setup
-- ==============================

-- Insert default Notion databases for new users
CREATE OR REPLACE FUNCTION public.setup_default_notion_databases(p_user_id uuid)
RETURNS VOID AS $$
BEGIN
  UPDATE user_profiles
  SET notion_databases = '[
    {
      "id": "daily_learning_log",
      "name": "Daily Learning Log",
      "type": "database",
      "sync_enabled": true,
      "auto_create": true
    },
    {
      "id": "focus_tracker",
      "name": "Focus Tracker",
      "type": "page",
      "sync_enabled": true,
      "auto_create": true
    },
    {
      "id": "cognitive_insights",
      "name": "Cognitive Insights",
      "type": "page",
      "sync_enabled": true,
      "auto_create": true
    },
    {
      "id": "action_items",
      "name": "Action Items",
      "type": "database",
      "sync_enabled": false,
      "auto_create": false
    }
  ]'::jsonb
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================
-- Migration Complete
-- ==============================
