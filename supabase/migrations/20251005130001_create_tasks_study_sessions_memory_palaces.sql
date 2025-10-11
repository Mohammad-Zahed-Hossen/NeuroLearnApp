-- Enable pgcrypto for gen_random_uuid() (Supabase usually supports this)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================
-- tasks
-- =========================
CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  description text,
  is_completed boolean NOT NULL DEFAULT false,
  priority integer NOT NULL DEFAULT 1,
  due timestamptz,
  project_name text,
  tags text[],                 -- simple array for tags
  labels text[],               -- simple array for labels
  todoist_id text,
  source text,
  created_at timestamptz NOT NULL DEFAULT now(),
  modified_at timestamptz
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS tasks_user_idx ON public.tasks (user_id);
CREATE INDEX IF NOT EXISTS tasks_created_idx ON public.tasks (user_id, created_at DESC);
-- GIN index for tags/labels array lookups
CREATE INDEX IF NOT EXISTS tasks_tags_gin ON public.tasks USING GIN (tags);
CREATE INDEX IF NOT EXISTS tasks_labels_gin ON public.tasks USING GIN (labels);

-- =========================
-- study_sessions
-- =========================
CREATE TABLE IF NOT EXISTS public.study_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  duration integer,                -- store duration in seconds or minutes per convention
  type text,
  cards_reviewed integer,
  correct_answers integer,
  total_answers integer,
  focus_rating numeric,
  notes text,
  cognitive_load numeric,
  completed boolean DEFAULT false,
  mode text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS study_sessions_user_idx ON public.study_sessions (user_id);
CREATE INDEX IF NOT EXISTS study_sessions_created_idx ON public.study_sessions (user_id, created_at DESC);

-- =========================
-- memory_palaces
-- =========================
CREATE TABLE IF NOT EXISTS public.memory_palaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  rooms jsonb DEFAULT '[]'::jsonb,       -- flexible structure for rooms
  locations jsonb DEFAULT '[]'::jsonb,   -- alternate representation
  total_items integer DEFAULT 0,
  mastered_items integer DEFAULT 0,
  last_studied timestamptz,
  is_active boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz
);

CREATE INDEX IF NOT EXISTS memory_palaces_user_idx ON public.memory_palaces (user_id);
-- GIN on JSONB for searching inside rooms/locations
CREATE INDEX IF NOT EXISTS memory_palaces_rooms_gin ON public.memory_palaces USING GIN (rooms);
CREATE INDEX IF NOT EXISTS memory_palaces_locations_gin ON public.memory_palaces USING GIN (locations);

-- =========================
-- Optional: helpful triggers to keep updated_at in sync
-- (If you want automatic updated_at maintenance)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER tasks_set_updated_at
BEFORE UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER memory_palaces_set_updated_at
BEFORE UPDATE ON public.memory_palaces
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER study_sessions_set_updated_at
BEFORE UPDATE ON public.study_sessions
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- =========================
-- Row Level Security (RLS) — recommended policies
-- =========================
-- Enable RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_palaces ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to SELECT/UPDATE/DELETE only their rows
CREATE POLICY "tasks_select_own" ON public.tasks
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "tasks_insert_own" ON public.tasks
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "tasks_update_own" ON public.tasks
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "tasks_delete_own" ON public.tasks
  FOR DELETE USING (user_id = auth.uid());

-- Repeat similarly for study_sessions and memory_palaces:
CREATE POLICY "study_sessions_select_own" ON public.study_sessions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "study_sessions_insert_own" ON public.study_sessions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "study_sessions_update_own" ON public.study_sessions FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "study_sessions_delete_own" ON public.study_sessions FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "memory_palaces_select_own" ON public.memory_palaces FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "memory_palaces_insert_own" ON public.memory_palaces FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "memory_palaces_update_own" ON public.memory_palaces FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "memory_palaces_delete_own" ON public.memory_palaces FOR DELETE USING (user_id = auth.uid());
