-- ==============================================
-- 🚀 NeuroLearn App: Consolidated and Optimized Schema
-- Single-file schema for easy copy-paste deployment (Supabase/PostgreSQL)
-- ==============================================

BEGIN;

-- ----------------------------------------------------
-- 1. BASE LEARNING & USER PROFILE TABLES
-- ----------------------------------------------------

-- User Profiles (Uses auth.users for ID)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  theme TEXT DEFAULT 'dark',
  daily_goal INT DEFAULT 60,
  auto_sync_enabled BOOLEAN DEFAULT TRUE,
  todoist_token TEXT,
  notion_token TEXT,
  notion_db_id TEXT,
  notion_db_id_logs TEXT,
  notifications JSONB DEFAULT '{"studyReminders":true,"breakAlerts":true,"reviewNotifications":true}',
  optimal_profile JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Flashcards (Spaced Repetition)
CREATE TABLE IF NOT EXISTS flashcards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  next_review_date TIMESTAMPTZ DEFAULT NOW(),
  stability REAL DEFAULT 0.5,
  difficulty REAL DEFAULT 0.5,
  created_by_ai BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Logic Nodes (Mind Map / Critical Thinking)
CREATE TABLE IF NOT EXISTS logic_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  question TEXT NOT NULL,
  type TEXT DEFAULT 'deductive' CHECK (type IN ('deductive', 'inductive', 'system-level')),
  next_review_date TIMESTAMPTZ DEFAULT NOW(),
  total_attempts INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Focus Sessions (Deep Work/Pomodoro)
CREATE TABLE IF NOT EXISTS focus_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration_minutes INT,
  self_report_focus INT CHECK (self_report_focus BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reading Sessions
CREATE TABLE IF NOT EXISTS reading_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  start_time TIMESTAMPTZ DEFAULT NOW(),
  duration_seconds INTEGER DEFAULT 0,
  wpm_achieved INTEGER DEFAULT 0,
  comprehension_score REAL DEFAULT 0,
  cognitive_load_start REAL DEFAULT 0.5,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  modified_at TIMESTAMPTZ DEFAULT NOW()
);

-- Neural Logs (Cognitive State Tracking)
CREATE TABLE IF NOT EXISTS neural_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  cognitive_load FLOAT DEFAULT 0.5,
  entrainment_score FLOAT DEFAULT 0.5
);

-- ----------------------------------------------------
-- 2. FINANCIAL TABLES
-- ----------------------------------------------------

-- Transactions (Core finance data)
CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  type TEXT CHECK (type IN ('income', 'expense')) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  -- Computed Columns (populated by trigger)
  month_year TEXT, -- YYYY-MM
  day_of_week INTEGER, -- 0 (Sunday) to 6 (Saturday)
  description_normalized TEXT, -- Cleaned for pattern matching
  merchant_category TEXT,
  is_recurring BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Budgets
CREATE TABLE IF NOT EXISTS budgets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, category) -- Enforce one active budget per user/category
);

-- Budget History (Snapshot for analytics)
CREATE TABLE IF NOT EXISTS budget_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  budget_id UUID REFERENCES budgets(id) ON DELETE CASCADE NOT NULL,
  month_year TEXT NOT NULL,
  actual_amount DECIMAL(12,2),
  utilization_percent DECIMAL(5,2),
  variance DECIMAL(12,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (budget_id, month_year)
);

-- Financial Insights (AI Alerts)
CREATE TABLE IF NOT EXISTS financial_insights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  insight_type TEXT CHECK (insight_type IN ('spending_pattern', 'budget_alert', 'forecast', 'recommendation')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority INTEGER DEFAULT 1 CHECK (priority BETWEEN 1 AND 5),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transaction Patterns (For AI categorization)
CREATE TABLE IF NOT EXISTS transaction_patterns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  description_pattern TEXT NOT NULL,
  suggested_category TEXT NOT NULL,
  confidence_score DECIMAL(3,2) DEFAULT 0.0,
  usage_count INTEGER DEFAULT 1,
  last_used TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, description_pattern)
);

-- ----------------------------------------------------
-- 3. HEALTH & WELLNESS TABLES
-- ----------------------------------------------------

-- Sleep Logs
CREATE TABLE IF NOT EXISTS sleep_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  bedtime TIME,
  wake_time TIME,
  duration DECIMAL(4,2),
  quality INTEGER CHECK (quality BETWEEN 1 AND 5),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  sleep_score INTEGER CHECK (sleep_score BETWEEN 0 AND 100),
  crdi_score INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, date)
);

-- Workout Logs
CREATE TABLE IF NOT EXISTS workout_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  workout_type TEXT NOT NULL,
  duration INTEGER NOT NULL,
  intensity INTEGER CHECK (intensity BETWEEN 1 AND 5),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  calories_burned INTEGER,
  recovery_score INTEGER CHECK (recovery_score BETWEEN 0 AND 100),
  exercise_category VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- HRV and Stress Data
CREATE TABLE IF NOT EXISTS hrv_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  rmssd DECIMAL(6,2),
  stress_score INTEGER CHECK (stress_score BETWEEN 0 AND 100),
  recovery_score INTEGER CHECK (recovery_score BETWEEN 0 AND 100),
  data_source TEXT DEFAULT 'estimated'
);

-- Circadian Data (for optimal routine)
CREATE TABLE IF NOT EXISTS circadian_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  crdi_score INTEGER CHECK (crdi_score BETWEEN 0 AND 100),
  chronotype TEXT CHECK (chronotype IN ('lark', 'owl', 'third-bird')),
  optimal_bedtime TIME,
  optimal_waketime TIME,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, date)
);

-- Health Habits (for habit tracking)
CREATE TABLE IF NOT EXISTS health_habits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  habit_type TEXT CHECK (habit_type IN ('sleep', 'exercise', 'nutrition', 'mindfulness', 'recovery', 'communication')),
  target_behavior TEXT NOT NULL,
  current_streak INTEGER DEFAULT 0,
  completion_rate DECIMAL(5,4) DEFAULT 0.0,
  ability_level INTEGER CHECK (ability_level BETWEEN 0 AND 100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Behavior Change Log (Tracking daily habit completion)
CREATE TABLE IF NOT EXISTS behavior_change_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  habit_id UUID REFERENCES health_habits(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  completion_quality INTEGER CHECK (completion_quality BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (habit_id, date)
);


-- ----------------------------------------------------
-- 4. FUNCTIONS & TRIGGERS (Automated Data Generation)
-- ----------------------------------------------------

-- 4.1. General Utility Function for 'updated_at'
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4.2. Function to populate computed columns in transactions
CREATE OR REPLACE FUNCTION populate_transaction_computed_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.month_year := TO_CHAR(NEW.date, 'YYYY-MM');
  NEW.day_of_week := EXTRACT(DOW FROM NEW.date);
  -- Normalize description for pattern matching and remove non-alphanumeric chars
  NEW.description_normalized := LOWER(TRIM(REGEXP_REPLACE(NEW.description, '[^a-zA-Z0-9\s]', ' ', 'g')));
  RETURN NEW;
END;
$$;

-- 4.3. Function to track budget performance and generate alerts (Called AFTER transaction)
CREATE OR REPLACE FUNCTION track_budget_performance()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  budget_rec budgets%ROWTYPE;
  current_spending DECIMAL;
  utilization DECIMAL;
BEGIN
  -- Only process expense transactions
  IF NEW.type != 'expense' THEN
    RETURN NEW;
  END IF;

  -- Find matching active budget
  SELECT * INTO budget_rec
  FROM budgets
  WHERE user_id = NEW.user_id
    AND category = NEW.category
    AND is_active = TRUE;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Calculate current month spending for this category
  SELECT COALESCE(SUM(amount), 0) INTO current_spending
  FROM transactions
  WHERE user_id = NEW.user_id
    AND category = NEW.category
    AND type = 'expense'
    AND month_year = NEW.month_year;

  utilization := (current_spending / budget_rec.amount) * 100;

  -- Update budget history record
  INSERT INTO budget_history (budget_id, month_year, actual_amount, utilization_percent, variance)
  VALUES (
    budget_rec.id,
    NEW.month_year,
    current_spending,
    utilization,
    current_spending - budget_rec.amount
  )
  ON CONFLICT (budget_id, month_year)
  DO UPDATE SET
    actual_amount = EXCLUDED.actual_amount,
    utilization_percent = EXCLUDED.utilization_percent,
    variance = EXCLUDED.variance;

  -- Generate financial insight/alert if budget is nearly or fully utilized
  IF utilization >= 90 THEN
    INSERT INTO financial_insights (user_id, insight_type, title, content, priority, metadata)
    VALUES (
      NEW.user_id,
      'budget_alert',
      CASE WHEN utilization >= 100 THEN 'Budget Exceeded!' ELSE 'Budget Alert' END,
      'You have spent ' || ROUND(utilization) || '% of your ' || NEW.category || ' budget this month.',
      CASE WHEN utilization >= 100 THEN 5 ELSE 4 END,
      JSONB_BUILD_OBJECT('category', NEW.category, 'utilization', utilization, 'amount', current_spending)
    )
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- 4.4. Function to update habit completion rate (Called AFTER behavior change log)
CREATE OR REPLACE FUNCTION update_habit_completion_rate()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  target_habit_id UUID;
  total_days INTEGER;
  completed_days INTEGER;
  new_rate NUMERIC;
BEGIN
  target_habit_id := COALESCE(NEW.habit_id, OLD.habit_id);

  -- Count total days since habit creation and completed days
  SELECT
    DATE_PART('day', CURRENT_DATE - hh.created_at::date) + 1,
    COUNT(CASE WHEN bcl.completed THEN 1 END)
  INTO total_days, completed_days
  FROM health_habits hh
  LEFT JOIN behavior_change_log bcl ON bcl.habit_id = hh.id
  WHERE hh.id = target_habit_id
  GROUP BY hh.created_at;

  -- Calculate completion rate
  new_rate := CASE WHEN total_days > 0 THEN completed_days::NUMERIC / total_days ELSE 0 END;

  -- Update the habit
  UPDATE health_habits
  SET completion_rate = LEAST(1.0, new_rate),
      updated_at = NOW()
  WHERE id = target_habit_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Apply Triggers
-- Note: Using DROP/CREATE for safety in a single-pass script
DROP TRIGGER IF EXISTS tr_populate_transaction_computed_columns ON transactions;
CREATE TRIGGER tr_populate_transaction_computed_columns
  BEFORE INSERT OR UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION populate_transaction_computed_columns();

DROP TRIGGER IF EXISTS tr_track_budget_performance ON transactions;
CREATE TRIGGER tr_track_budget_performance
  AFTER INSERT OR UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION track_budget_performance();

DROP TRIGGER IF EXISTS tr_update_habit_completion_rate ON behavior_change_log;
CREATE TRIGGER tr_update_habit_completion_rate
  AFTER INSERT OR UPDATE OR DELETE ON behavior_change_log
  FOR EACH ROW EXECUTE FUNCTION update_habit_completion_rate();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_flashcards_updated_at BEFORE UPDATE ON flashcards FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_logic_nodes_updated_at BEFORE UPDATE ON logic_nodes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_health_habits_updated_at BEFORE UPDATE ON health_habits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ----------------------------------------------------
-- 5. ANALYTICS VIEW (v_holistic_user_data)
-- Fixes the nested aggregate error and consolidates metrics
-- ----------------------------------------------------

CREATE OR REPLACE VIEW v_holistic_user_data AS
-- Holistic user data view for AI insights
WITH current_context AS (
  SELECT
    TO_CHAR(NOW(), 'YYYY-MM') AS month_year,
    NOW() AS current_time,
    AUTH.UID() AS user_id
),
category_spending AS (
  SELECT
    t.user_id,
    t.category,
    SUM(t.amount) AS spent
  FROM transactions t, current_context cc
  WHERE t.type = 'expense' AND t.month_year = cc.month_year
  GROUP BY t.user_id, t.category
),
-- FIX: Separating aggregation levels for category_breakdown
category_breakdown_data AS (
  SELECT
    user_id,
    COALESCE(JSONB_OBJECT_AGG(category, spent), '{}'::jsonb) AS category_breakdown
  FROM category_spending
  GROUP BY user_id
),
budget_data AS (
  SELECT
    b.user_id,
    JSONB_AGG(
      JSONB_BUILD_OBJECT(
        'category', b.category,
        'spent', COALESCE(cs.spent, 0),
        'limit', b.amount,
        'utilization', CASE WHEN b.amount > 0 THEN (COALESCE(cs.spent, 0) / b.amount) * 100 ELSE 0 END
      )
    ) AS budget_utilization
  FROM budgets b
  LEFT JOIN category_spending cs ON b.category = cs.category AND b.user_id = cs.user_id
  WHERE b.is_active = TRUE
  GROUP BY b.user_id
),
financial_metrics AS (
  SELECT
    t.user_id,
    SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END) AS monthly_income,
    SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END) AS monthly_expenses,
    CASE
      WHEN SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END) > 0
      THEN ((SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END) - SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END)) / SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END)) * 100
      ELSE 0
    END AS savings_rate
  FROM transactions t, current_context cc
  WHERE t.month_year = cc.month_year
  GROUP BY t.user_id
),
-- Aggregated Health Metrics (Past 7 Days Average)
health_metrics AS (
  SELECT
    cc.user_id,
    COALESCE(AVG(sl.crdi_score), 50) AS crdi_score,
    COALESCE(AVG(sl.quality), 3) AS sleep_quality,
    COALESCE(COUNT(DISTINCT wl.date), 0) AS exercise_frequency, -- Unique workout days
    COALESCE(AVG(hd.stress_score), 50) AS stress_level,
    COALESCE(AVG(hd.recovery_score), 50) AS recovery_score
  FROM current_context cc
  LEFT JOIN sleep_logs sl ON sl.user_id = cc.user_id AND sl.date >= cc.current_time::date - INTERVAL '7 days'
  LEFT JOIN workout_logs wl ON wl.user_id = cc.user_id AND wl.date >= cc.current_time::date - INTERVAL '7 days'
  LEFT JOIN hrv_data hd ON hd.user_id = cc.user_id AND hd.timestamp >= cc.current_time - INTERVAL '7 days'
  GROUP BY cc.user_id
),
-- Aggregated Learning Metrics (Current/Recent)
learning_metrics AS (
  SELECT
    cc.user_id,
    COALESCE(COUNT(DISTINCT ln.id), 0) AS active_nodes,
    COALESCE(MAX(nl.cognitive_load), 0.5) AS cognitive_load, -- Proxy for peak cognitive load
    COALESCE(COUNT(DISTINCT DATE(COALESCE(fs.start_time, rs.start_time))), 0) AS study_streak -- Days with a session in last 7 days
  FROM current_context cc
  LEFT JOIN logic_nodes ln ON ln.user_id = cc.user_id AND ln.next_review_date >= cc.current_time - INTERVAL '7 days'
  LEFT JOIN neural_logs nl ON nl.user_id = cc.user_id AND nl.timestamp >= cc.current_time - INTERVAL '7 days'
  LEFT JOIN focus_sessions fs ON fs.user_id = cc.user_id AND fs.start_time >= cc.current_time - INTERVAL '7 days'
  LEFT JOIN reading_sessions rs ON rs.user_id = cc.user_id AND rs.start_time >= cc.current_time - INTERVAL '7 days'
  GROUP BY cc.user_id
)

SELECT
  u.id AS user_id,
  u.email,

  -- Financial metrics (current month)
  COALESCE(fm.monthly_income, 0) AS monthly_income,
  COALESCE(fm.monthly_expenses, 0) AS monthly_expenses,
  COALESCE(fm.savings_rate, 0) AS savings_rate,
  cbd.category_breakdown,
  bd.budget_utilization,

  -- Health metrics (past 7 days average)
  hm.crdi_score,
  hm.sleep_quality,
  hm.exercise_frequency,
  hm.stress_level,
  hm.recovery_score,

  -- Learning metrics (current/recent)
  lm.active_nodes,
  lm.study_streak,
  lm.cognitive_load,

  -- Temporal context
  EXTRACT(HOUR FROM cc.current_time) AS current_hour,
  TO_CHAR(cc.current_time, 'Day') AS current_day,
  TO_CHAR(cc.current_time, 'Month') AS current_month

FROM auth.users u, current_context cc
LEFT JOIN financial_metrics fm ON u.id = fm.user_id
LEFT JOIN category_breakdown_data cbd ON u.id = cbd.user_id
LEFT JOIN budget_data bd ON u.id = bd.user_id
LEFT JOIN health_metrics hm ON u.id = hm.user_id
LEFT JOIN learning_metrics lm ON u.id = lm.user_id
WHERE u.id = cc.user_id; -- Apply RLS filter for Supabase/PostgREST access


-- ----------------------------------------------------
-- 6. SECURITY: ROW LEVEL SECURITY (RLS) & INDEXES
-- ----------------------------------------------------

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE logic_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE focus_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE neural_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE sleep_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrv_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE circadian_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE behavior_change_log ENABLE ROW LEVEL SECURITY;


-- 6.1. RLS Policies (Simple self-management)
DO $$
DECLARE
  table_name TEXT;
  policy_name TEXT;
BEGIN
  -- List of tables where RLS is simply 'user_id = auth.uid()'
  FOR table_name IN SELECT relname FROM pg_class WHERE relkind = 'r' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public') LOOP
    policy_name := 'Users can manage own ' || table_name;

    IF table_name IN ('user_profiles', 'flashcards', 'logic_nodes', 'focus_sessions', 'reading_sessions', 'neural_logs', 'transactions', 'budgets', 'financial_insights', 'transaction_patterns', 'sleep_logs', 'workout_logs', 'hrv_data', 'circadian_data', 'health_habits', 'behavior_change_log') THEN
        EXECUTE FORMAT('
          DROP POLICY IF EXISTS "%s" ON %I;
          CREATE POLICY "%s"
            ON %I FOR ALL
            USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id);
        ', policy_name, table_name, policy_name, table_name);
    END IF;
  END LOOP;
END
$$;

-- 6.2. Complex RLS Policies
CREATE POLICY "Users can manage their own budget history" ON budget_history
  FOR ALL USING (EXISTS (SELECT 1 FROM budgets b WHERE b.id = budget_history.budget_id AND b.user_id = auth.uid()));

-- 6.3. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_flashcards_user_review ON flashcards(user_id, next_review_date);
CREATE INDEX IF NOT EXISTS idx_transactions_user_month ON transactions(user_id, month_year);
CREATE INDEX IF NOT EXISTS idx_transactions_category_date ON transactions(user_id, category, date DESC);
CREATE INDEX IF NOT EXISTS idx_sleep_logs_user_date ON sleep_logs(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_hrv_data_user_timestamp ON hrv_data(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_behavior_log_habit_date ON behavior_change_log(habit_id, date DESC);

-- 6.4. Grants
-- Grant access to the view which is the main data source for the AI
GRANT SELECT ON v_holistic_user_data TO authenticated;

COMMIT;
