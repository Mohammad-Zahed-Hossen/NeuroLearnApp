-- This migration was converted to a no-op to avoid changing the return
-- signature of an existing function in the remote database which would
-- cause a failure during `supabase db push`. The actual, non-breaking
-- fix is provided in migration 20251008121000_create_get_notion_sync_stats_v2.sql
-- which creates a new function `get_notion_sync_stats_v2`.

-- No-op migration.
