-- Migration: Create get_notion_sync_stats_v2 function (non-breaking)
-- Created: 2025-10-08

CREATE OR REPLACE FUNCTION public.get_notion_sync_stats_v2(p_user_id uuid)
RETURNS TABLE (
  total_pages INTEGER,
  total_blocks INTEGER,
  total_links INTEGER,
  last_sync TIMESTAMPTZ,
  sync_status_text TEXT,
  sync_status TEXT,
  pending_changes INTEGER,
  successful_syncs_today INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*)::INTEGER FROM public.notion_pages np WHERE np.user_id = p_user_id AND np.archived = false),
    (SELECT COUNT(*)::INTEGER FROM public.notion_blocks nb WHERE nb.user_id = p_user_id),
    (SELECT COUNT(*)::INTEGER FROM public.notion_links nl WHERE nl.user_id = p_user_id AND nl.is_active = true),
    up.notion_last_sync,
    CASE
      WHEN up.notion_last_sync IS NULL THEN 'stale'
      WHEN up.notion_last_sync >= NOW() - INTERVAL '30 minutes' THEN 'current'
      WHEN up.notion_last_sync >= NOW() - INTERVAL '1 hour' THEN 'pending'
      ELSE 'stale'
    END AS sync_status_text,
    CASE
      WHEN up.notion_last_sync IS NULL THEN 'stale'
      WHEN up.notion_last_sync >= NOW() - INTERVAL '30 minutes' THEN 'current'
      WHEN up.notion_last_sync >= NOW() - INTERVAL '1 hour' THEN 'pending'
      ELSE 'stale'
    END AS sync_status,
    (SELECT COUNT(*)::INTEGER FROM public.notion_pages np2 WHERE np2.user_id = p_user_id AND np2.sync_status = 'pending'),
    (SELECT COUNT(*)::INTEGER FROM public.notion_sync_sessions nss
     WHERE nss.user_id = p_user_id
       AND nss.status = 'completed'
       AND nss.started_at >= date_trunc('day', NOW()))
  FROM public.user_profiles up
  WHERE up.id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
