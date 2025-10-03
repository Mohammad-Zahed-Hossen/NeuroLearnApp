-- ==============================
-- NeuroLearn App - Supabase Schema
-- Complete migration from AsyncStorage to PostgreSQL
-- ==============================

-- Enable Row Level Security

-- ==============================
-- 1. User Profiles
-- ==============================
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  theme TEXT DEFAULT 'dark',
  daily_goal INT DEFAULT 60,
  auto_sync_enabled BOOLEAN DEFAULT true,
  todoist_token TEXT,
  notion_token TEXT,
  notion_db_id TEXT,
  notion_db_id_logs TEXT,
  notifications JSONB DEFAULT '{"studyReminders":true,"breakAlerts":true,"reviewNotifications":true}',
  optimal_profile JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own profile"
  ON user_profiles FOR ALL
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ==============================
-- 2. Flashcards
-- ==============================
CREATE TABLE IF NOT EXISTS flashcards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  source_id UUID,
  category TEXT DEFAULT 'general',
  next_review_date TIMESTAMPTZ DEFAULT NOW(),
  stability REAL DEFAULT 0.5,
  difficulty REAL DEFAULT 0.5,
  created_by_ai BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own flashcards"
  ON flashcards FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_flashcards_user_id ON flashcards(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_next_review ON flashcards(next_review_date);

-- ==============================
-- 3. Logic Nodes
-- ==============================
CREATE TABLE IF NOT EXISTS logic_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  question TEXT NOT NULL,
  type TEXT DEFAULT 'deductive',
  next_review_date TIMESTAMPTZ DEFAULT NOW(),
  total_attempts INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE logic_nodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own logic nodes"
  ON logic_nodes FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_logic_nodes_user_id ON logic_nodes(user_id);

-- ==============================
-- 4. Reading Sessions
-- ==============================
CREATE TABLE IF NOT EXISTS reading_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  start_time TIMESTAMPTZ DEFAULT NOW(),
  duration_seconds INTEGER DEFAULT 0,
  source_title TEXT,
  source_text TEXT,
  words_read INTEGER DEFAULT 0,
  wpm_achieved INTEGER DEFAULT 0,
  comprehension_score REAL DEFAULT 0,
  quiz_id UUID,
  notion_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE reading_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own reading sessions"
  ON reading_sessions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_reading_sessions_user_id ON reading_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_reading_sessions_created_at ON reading_sessions(created_at);

-- ==============================
-- 4.5. Quizzes
-- ==============================
CREATE TABLE IF NOT EXISTS quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES reading_sessions ON DELETE CASCADE,
  quiz_type TEXT DEFAULT 'MCQ_COMPREHENSION',
  quiz_data JSONB DEFAULT '{}',
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own quizzes"
  ON quizzes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM reading_sessions rs
      WHERE rs.id = quizzes.session_id
      AND rs.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM reading_sessions rs
      WHERE rs.id = quizzes.session_id
      AND rs.user_id = auth.uid()
    )
  );

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_quizzes_session_id ON quizzes(session_id);

-- ==============================
-- 5. Focus Sessions
-- ==============================
CREATE TABLE IF NOT EXISTS focus_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration_minutes INT,
  self_report_focus INT CHECK (self_report_focus >= 1 AND self_report_focus <= 5),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE focus_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own focus sessions"
  ON focus_sessions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_id ON focus_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_start_time ON focus_sessions(start_time);

-- ==============================
-- 6. Distraction Events
-- ==============================
CREATE TABLE IF NOT EXISTS distraction_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES focus_sessions ON DELETE CASCADE,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  trigger_type TEXT DEFAULT 'unknown'
);

ALTER TABLE distraction_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage distraction events tied to own focus sessions"
  ON distraction_events FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM focus_sessions fs
      WHERE fs.id = distraction_events.session_id
      AND fs.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM focus_sessions fs
      WHERE fs.id = distraction_events.session_id
      AND fs.user_id = auth.uid()
    )
  );

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_distraction_events_session_id ON distraction_events(session_id);

-- ==============================
-- 7. Neural Logs
-- ==============================
CREATE TABLE IF NOT EXISTS neural_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  cognitive_load FLOAT DEFAULT 0.5,
  entrainment_score FLOAT DEFAULT 0.5
);

ALTER TABLE neural_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own neural logs"
  ON neural_logs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_neural_logs_user_id ON neural_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_neural_logs_timestamp ON neural_logs(timestamp);

-- ==============================
-- 8. Functions for automatic timestamps
-- ==============================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_flashcards_updated_at BEFORE UPDATE ON flashcards FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_logic_nodes_updated_at BEFORE UPDATE ON logic_nodes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================
-- 9. Sample Data (Optional)
-- ==============================
-- This will be populated by the migration service

-- ==============================
-- 10. Performance Optimizations
-- ==============================


-- ==============================
-- ✅ Schema Complete
-- ==============================
-- All tables enforce RLS for security
-- Indexes added for performance
-- Foreign key constraints ensure data integrity
-- JSONB used for flexible data storage
-- Automatic timestamps with triggers