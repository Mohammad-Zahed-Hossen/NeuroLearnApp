-- Migration: create context_snapshots table
-- Purpose: Provide the schema expected by SupabaseStorageService.ts
-- Run this against your Supabase Postgres database (via psql or supabase CLI)

CREATE TABLE IF NOT EXISTS public.context_snapshots (
  id text PRIMARY KEY,
  user_id text NOT NULL,
  session_id text,
  timestamp timestamptz NOT NULL,
  time_intelligence jsonb,
  location_context jsonb,
  digital_body_language jsonb,
  overall_optimality numeric,
  context_quality_score numeric,
  device_state jsonb,
  context_hash text NOT NULL,
  version integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  modified_at timestamptz DEFAULT now()
);

-- Ensure context_hash deduplication as used by upsert(..., { onConflict: 'context_hash' })
CREATE UNIQUE INDEX IF NOT EXISTS idx_context_snapshots_context_hash ON public.context_snapshots (context_hash);

-- Indexes for expected query patterns
CREATE INDEX IF NOT EXISTS idx_context_snapshots_user_id ON public.context_snapshots (user_id);
CREATE INDEX IF NOT EXISTS idx_context_snapshots_session_id ON public.context_snapshots (session_id);
CREATE INDEX IF NOT EXISTS idx_context_snapshots_timestamp ON public.context_snapshots (timestamp DESC);

-- Trigger to keep modified_at updated
CREATE OR REPLACE FUNCTION public.update_modified_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.modified_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_modified_at ON public.context_snapshots;
CREATE TRIGGER trg_update_modified_at
BEFORE UPDATE ON public.context_snapshots
FOR EACH ROW
EXECUTE PROCEDURE public.update_modified_at();

-- Helpful comment: if your app expects a "progressive" JSON blob adapt fields as needed.

-- End of migration
