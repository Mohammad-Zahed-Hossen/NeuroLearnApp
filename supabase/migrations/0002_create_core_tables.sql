-- Migration: create core tables used by NeuroLearn app
-- Purpose: Provision common tables referenced by SupabaseStorageService.ts
-- Run this against your Supabase Postgres database (via psql or supabase CLI)

-- Note: This script is intentionally idempotent (uses IF NOT EXISTS)

-- USER PROFILES
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id text PRIMARY KEY,
  theme text,
  daily_goal integer,
  todoist_token text,
  notion_token text,
  auto_sync_enabled boolean DEFAULT true,
  notifications jsonb,
  optimal_profile jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_user_profiles_id ON public.user_profiles (id);

-- FLASHCARDS
CREATE TABLE IF NOT EXISTS public.flashcards (
  id text PRIMARY KEY,
  user_id text NOT NULL,
  front text,
  back text,
  category text,
  next_review_date timestamptz,
  stability numeric,
  focus_strength numeric,
  created_at timestamptz DEFAULT now(),
  modified_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_flashcards_user_id ON public.flashcards (user_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_created_at ON public.flashcards (created_at DESC);

-- LEARNED PATTERNS
CREATE TABLE IF NOT EXISTS public.learned_patterns (
  id text PRIMARY KEY,
  user_id text NOT NULL,
  type text,
  pattern jsonb,
  last_seen timestamptz,
  effectiveness numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_learned_patterns_user_id ON public.learned_patterns (user_id);

-- OPTIMAL LEARNING WINDOWS
CREATE TABLE IF NOT EXISTS public.optimal_learning_windows (
  id text PRIMARY KEY,
  user_id text NOT NULL,
  circadian_hour integer,
  day_of_week integer,
  performance_score numeric,
  frequency integer,
  last_performance numeric,
  last_seen timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_opt_learning_user_id ON public.optimal_learning_windows (user_id);

-- DISTRACTION EVENTS
CREATE TABLE IF NOT EXISTS public.distraction_events (
  id text PRIMARY KEY,
  user_id text,
  session_id text,
  distraction_type text DEFAULT 'unknown',
  duration_ms integer DEFAULT 0,
  severity text DEFAULT 'low',
  metadata jsonb DEFAULT '{}',
  timestamp timestamptz DEFAULT now(),
  client_generated_id text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_distraction_session ON public.distraction_events (session_id);
CREATE INDEX IF NOT EXISTS idx_distraction_user ON public.distraction_events (user_id);

-- SLEEP LOGS
CREATE TABLE IF NOT EXISTS public.sleep_logs (
  id text PRIMARY KEY,
  user_id text NOT NULL,
  bedtime timestamptz,
  wake_time timestamptz,
  duration numeric,
  quality integer,
  sleep_score numeric,
  sleep_debt numeric,
  date date,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sleep_user_date ON public.sleep_logs (user_id, date DESC);

-- CIRCADIAN DATA
CREATE TABLE IF NOT EXISTS public.circadian_data (
  id text PRIMARY KEY,
  user_id text NOT NULL,
  date date,
  crdi numeric,
  sleep_pressure numeric,
  phase text,
  details jsonb,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_circadian_user ON public.circadian_data (user_id);

-- NEURAL LOGS
CREATE TABLE IF NOT EXISTS public.neural_logs (
  id text PRIMARY KEY,
  user_id text,
  timestamp timestamptz,
  cognitive_load numeric,
  entrainment_score numeric,
  notes text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_neural_user ON public.neural_logs (user_id);

-- FOCUS SESSIONS
CREATE TABLE IF NOT EXISTS public.focus_sessions (
  id text PRIMARY KEY,
  user_id text,
  start_time timestamptz,
  end_time timestamptz,
  duration_minutes integer,
  self_report_focus integer,
  created_at timestamptz DEFAULT now(),
  modified_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_focus_user ON public.focus_sessions (user_id);

-- READING SESSIONS
CREATE TABLE IF NOT EXISTS public.reading_sessions (
  id text PRIMARY KEY,
  user_id text,
  text_source text,
  text_title text,
  text_difficulty text,
  word_count integer,
  wpm_goal integer,
  wpm_achieved integer,
  wpm_peak integer,
  comprehension_score numeric,
  start_time timestamptz,
  end_time timestamptz,
  total_duration_ms integer,
  reading_duration_ms integer,
  pause_duration_ms integer,
  fixation_accuracy numeric,
  regression_count integer,
  sub_vocalization_events jsonb,
  cognitive_load_start numeric,
  cognitive_load_end numeric,
  display_mode text,
  chunk_size integer,
  pause_on_punctuation boolean,
  highlight_vowels boolean,
  concepts_identified jsonb,
  neural_nodes_strengthened jsonb,
  source_links jsonb,
  created_at timestamptz DEFAULT now(),
  modified_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reading_user ON public.reading_sessions (user_id);

-- LOGIC NODES
CREATE TABLE IF NOT EXISTS public.logic_nodes (
  id text PRIMARY KEY,
  user_id text,
  custom_id text,
  question text,
  type text,
  next_review_date timestamptz,
  total_attempts integer,
  created_at timestamptz DEFAULT now(),
  modified_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_logic_user ON public.logic_nodes (user_id);

-- TASKS
CREATE TABLE IF NOT EXISTS public.tasks (
  id text PRIMARY KEY,
  user_id text,
  content text,
  description text,
  is_completed boolean DEFAULT false,
  priority integer DEFAULT 1,
  due date,
  project_name text,
  tags jsonb,
  labels jsonb,
  todoist_id text,
  source text,
  created_at timestamptz DEFAULT now(),
  modified_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tasks_user ON public.tasks (user_id);

-- MEMORY PALACES
CREATE TABLE IF NOT EXISTS public.memory_palaces (
  id text PRIMARY KEY,
  user_id text,
  name text,
  description text,
  rooms jsonb,
  locations jsonb,
  total_items integer,
  mastered_items integer,
  last_studied timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_memory_user ON public.memory_palaces (user_id);

-- SOURCE LINKS
CREATE TABLE IF NOT EXISTS public.source_links (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id text,
  type text,
  session_id text,
  text_source text,
  concept_id text,
  relevance_score numeric,
  extracted_at timestamptz,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_source_user ON public.source_links (user_id);

-- USER PROGRESS
CREATE TABLE IF NOT EXISTS public.user_progress (
  user_id text PRIMARY KEY,
  progress jsonb,
  total_points integer DEFAULT 0,
  level integer DEFAULT 1,
  updated_at timestamptz DEFAULT now()
);

-- COGNITIVE METRICS
CREATE TABLE IF NOT EXISTS public.cognitive_metrics (
  id text PRIMARY KEY,
  user_id text,
  timestamp timestamptz,
  focus_score numeric,
  attention_span numeric,
  task_switching_rate numeric,
  error_rate numeric,
  response_time numeric,
  session_quality numeric,
  cognitive_load numeric,
  mental_fatigue numeric,
  attention_score numeric,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cognitive_user ON public.cognitive_metrics (user_id);

-- HEALTH METRICS
CREATE TABLE IF NOT EXISTS public.health_metrics (
  id text PRIMARY KEY,
  user_id text,
  date date,
  sleep_hours numeric,
  sleep_quality numeric,
  workout_intensity numeric,
  stress_level numeric,
  heart_rate_avg numeric,
  steps integer,
  calories_burned numeric,
  recovery_score numeric,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_health_user ON public.health_metrics (user_id);

-- STUDY SESSIONS
CREATE TABLE IF NOT EXISTS public.study_sessions (
  id text PRIMARY KEY,
  user_id text,
  start_time timestamptz,
  end_time timestamptz,
  duration numeric,
  type text,
  cards_reviewed integer,
  correct_answers integer,
  total_answers integer,
  focus_rating numeric,
  notes text,
  cognitive_load numeric,
  completed boolean DEFAULT false,
  mode text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_study_user ON public.study_sessions (user_id);

-- KNOWN LOCATIONS
CREATE TABLE IF NOT EXISTS public.known_locations (
  id text PRIMARY KEY,
  user_id text,
  name text,
  coordinates jsonb,
  environment text,
  performance_history numeric[],
  average_performance numeric,
  visit_count integer,
  last_visit timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_known_locations_user ON public.known_locations (user_id);

-- COGNITIVE FORECASTING
CREATE TABLE IF NOT EXISTS public.cognitive_forecasting (
  id text PRIMARY KEY,
  user_id text,
  model_version text,
  predicted_context text,
  predicted_optimality numeric,
  prediction_horizon integer,
  actual_context text,
  actual_optimality numeric,
  prediction_accuracy numeric,
  created_at timestamptz DEFAULT now(),
  evaluated_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_cogforecast_user ON public.cognitive_forecasting (user_id);

-- BUDGET ANALYSIS
CREATE TABLE IF NOT EXISTS public.budget_analysis (
  user_id text PRIMARY KEY,
  categories jsonb,
  savings_rate numeric,
  total_income numeric,
  total_expenses numeric,
  budget_utilization numeric,
  last_updated timestamptz DEFAULT now()
);

-- Reuse update_modified_at trigger function if present (created by migration 0001)
-- If the function does not exist, create a safe fallback
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_modified_at') THEN
    CREATE OR REPLACE FUNCTION public.update_modified_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.modified_at = now();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  END IF;
END$$;

-- Attach triggers for tables that use modified_at/updated_at columns
-- Flashcards
DROP TRIGGER IF EXISTS trg_update_modified_at_flashcards ON public.flashcards;
CREATE TRIGGER trg_update_modified_at_flashcards
BEFORE UPDATE ON public.flashcards
FOR EACH ROW
EXECUTE PROCEDURE public.update_modified_at();

-- Reading sessions
DROP TRIGGER IF EXISTS trg_update_modified_at_reading_sessions ON public.reading_sessions;
CREATE TRIGGER trg_update_modified_at_reading_sessions
BEFORE UPDATE ON public.reading_sessions
FOR EACH ROW
EXECUTE PROCEDURE public.update_modified_at();

-- Logic nodes
DROP TRIGGER IF EXISTS trg_update_modified_at_logic_nodes ON public.logic_nodes;
CREATE TRIGGER trg_update_modified_at_logic_nodes
BEFORE UPDATE ON public.logic_nodes
FOR EACH ROW
EXECUTE PROCEDURE public.update_modified_at();

-- Tasks
DROP TRIGGER IF EXISTS trg_update_modified_at_tasks ON public.tasks;
CREATE TRIGGER trg_update_modified_at_tasks
BEFORE UPDATE ON public.tasks
FOR EACH ROW
EXECUTE PROCEDURE public.update_modified_at();

-- Memory palaces
DROP TRIGGER IF EXISTS trg_update_modified_at_memory_palaces ON public.memory_palaces;
CREATE TRIGGER trg_update_modified_at_memory_palaces
BEFORE UPDATE ON public.memory_palaces
FOR EACH ROW
EXECUTE PROCEDURE public.update_modified_at();

-- Known locations
DROP TRIGGER IF EXISTS trg_update_modified_at_known_locations ON public.known_locations;
CREATE TRIGGER trg_update_modified_at_known_locations
BEFORE UPDATE ON public.known_locations
FOR EACH ROW
EXECUTE PROCEDURE public.update_modified_at();

-- End of migration
