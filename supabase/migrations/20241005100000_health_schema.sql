-- Drop existing tables if they exist (for clean migration)
DROP TABLE IF EXISTS sleep_architecture CASCADE;
DROP TABLE IF EXISTS hrv_data CASCADE;
DROP TABLE IF EXISTS health_habits CASCADE;
DROP TABLE IF EXISTS circadian_data CASCADE;
DROP TABLE IF EXISTS chromotherapy_preferences CASCADE;
DROP TABLE IF EXISTS workout_biometrics CASCADE;

-- Enhanced Sleep Logs Table (modify existing)
ALTER TABLE IF EXISTS sleep_logs 
ADD COLUMN IF NOT EXISTS sleep_score INTEGER CHECK (sleep_score >= 0 AND sleep_score <= 100),
ADD COLUMN IF NOT EXISTS sleep_debt INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS crdi_score INTEGER,
ADD COLUMN IF NOT EXISTS estimated_cycles DECIMAL(3,1),
ADD COLUMN IF NOT EXISTS sleep_efficiency DECIMAL(5,2);

-- Enhanced Workout Logs Table (modify existing)
ALTER TABLE IF EXISTS workout_logs
ADD COLUMN IF NOT EXISTS calories_burned INTEGER,
ADD COLUMN IF NOT EXISTS heart_rate_avg INTEGER,
ADD COLUMN IF NOT EXISTS heart_rate_max INTEGER,
ADD COLUMN IF NOT EXISTS recovery_score INTEGER CHECK (recovery_score >= 0 AND recovery_score <= 100),
ADD COLUMN IF NOT EXISTS target_zone VARCHAR(20),
ADD COLUMN IF NOT EXISTS exercise_category VARCHAR(50);

-- Circadian Health Analysis Table
CREATE TABLE circadian_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  crdi_score INTEGER CHECK (crdi_score >= 0 AND crdi_score <= 100),
  sleep_pressure INTEGER CHECK (sleep_pressure >= 0 AND sleep_pressure <= 100),
  alertness_score INTEGER CHECK (alertness_score >= 0 AND alertness_score <= 100),
  chronotype TEXT CHECK (chronotype IN ('lark', 'owl', 'third-bird')),
  light_exposure_minutes INTEGER DEFAULT 0,
  cognitive_load_factor DECIMAL(4,2) DEFAULT 0.0,
  optimal_bedtime TIME,
  optimal_waketime TIME,
  prediction_confidence DECIMAL(3,2) CHECK (prediction_confidence >= 0 AND prediction_confidence <= 1),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Heart Rate Variability and Biometric Data
CREATE TABLE hrv_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  rmssd DECIMAL(6,2), -- Root Mean Square of Successive Differences
  pnn50 DECIMAL(5,2), -- Percentage of successive RR intervals that differ by more than 50ms
  heart_rate_avg INTEGER,
  heart_rate_variability INTEGER,
  stress_score INTEGER CHECK (stress_score >= 0 AND stress_score <= 100),
  recovery_score INTEGER CHECK (recovery_score >= 0 AND recovery_score <= 100),
  autonomic_balance TEXT CHECK (autonomic_balance IN ('balanced', 'sympathetic-dominant', 'parasympathetic-dominant')),
  data_source TEXT CHECK (data_source IN ('manual', 'device', 'estimated')) DEFAULT 'estimated'
);

-- Advanced Health Habits with Behavioral Science
CREATE TABLE health_habits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  habit_type TEXT CHECK (habit_type IN ('sleep', 'exercise', 'nutrition', 'mindfulness', 'recovery')),
  target_behavior TEXT NOT NULL,
  frequency TEXT CHECK (frequency IN ('daily', 'weekly', 'custom')),
  difficulty INTEGER CHECK (difficulty >= 1 AND difficulty <= 5),
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  completion_rate DECIMAL(5,4) DEFAULT 0.0,
  motivation_level INTEGER CHECK (motivation_level >= 0 AND motivation_level <= 100),
  ability_level INTEGER CHECK (ability_level >= 0 AND ability_level <= 100),
  trigger_effectiveness INTEGER CHECK (trigger_effectiveness >= 0 AND trigger_effectiveness <= 100),
  triggers TEXT[], -- Array of trigger strings
  rewards TEXT[], -- Array of reward strings
  behavior_change_stage TEXT CHECK (behavior_change_stage IN ('precontemplation', 'contemplation', 'preparation', 'action', 'maintenance')),
  identity_markers TEXT[], -- For identity-based change
  implementation_intentions TEXT[], -- If-then plans
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sleep Architecture Analysis
CREATE TABLE sleep_architecture (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sleep_log_id UUID REFERENCES sleep_logs(id) ON DELETE CASCADE,
  deep_sleep_percentage DECIMAL(5,2),
  rem_percentage DECIMAL(5,2),
  light_sleep_percentage DECIMAL(5,2),
  sleep_efficiency DECIMAL(5,2), -- Time asleep / Time in bed * 100
  fragmentation_index DECIMAL(6,3), -- Measure of sleep interruptions
  estimated_cycles INTEGER,
  sleep_debt_minutes INTEGER DEFAULT 0,
  recovery_sleep_needed INTEGER DEFAULT 0,
  analysis_confidence DECIMAL(3,2) DEFAULT 0.0,
  data_source TEXT DEFAULT 'estimated' -- 'device', 'manual', 'estimated'
);

-- Workout Biometrics (separate from main workout log for detailed tracking)
CREATE TABLE workout_biometrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workout_log_id UUID REFERENCES workout_logs(id) ON DELETE CASCADE,
  heart_rate_data JSONB, -- Time-series HR data if available
  heart_rate_zones JSONB, -- Time in each HR zone
  perceived_exertion INTEGER CHECK (perceived_exertion >= 1 AND perceived_exertion <= 10),
  recovery_heart_rate INTEGER, -- HR 1 minute after exercise
  blood_pressure_systolic INTEGER,
  blood_pressure_diastolic INTEGER,
  vo2_max_estimate DECIMAL(4,1),
  lactate_threshold_estimate INTEGER,
  power_output_avg INTEGER, -- For cycling/rowing
  cadence_avg INTEGER,
  environmental_temp DECIMAL(4,1),
  environmental_humidity DECIMAL(4,1)
);

-- Color Therapy and Chromotherapy Preferences
CREATE TABLE chromotherapy_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  morning_colors JSONB, -- Preferred color palette for morning
  afternoon_colors JSONB,
  evening_colors JSONB,
  workout_colors JSONB, -- Colors by workout type
  stress_response_colors JSONB,
  recovery_colors JSONB,
  breathing_exercise_colors JSONB,
  color_sensitivity_level INTEGER CHECK (color_sensitivity_level >= 1 AND color_sensitivity_level <= 5) DEFAULT 3,
  adaptive_coloring_enabled BOOLEAN DEFAULT TRUE,
  last_color_analysis TIMESTAMP WITH TIME ZONE,
  effectiveness_ratings JSONB, -- User feedback on color effectiveness
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Achievement System for Gamification
CREATE TABLE health_achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_type TEXT CHECK (achievement_type IN ('streak', 'milestone', 'improvement', 'consistency', 'recovery', 'performance')),
  achievement_category TEXT CHECK (achievement_category IN ('sleep', 'exercise', 'nutrition', 'mindfulness', 'overall')),
  achievement_name TEXT NOT NULL,
  achievement_description TEXT,
  requirement_value INTEGER, -- e.g., 30 for "30-day streak"
  current_progress INTEGER DEFAULT 0,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  reward_type TEXT CHECK (reward_type IN ('badge', 'points', 'unlock', 'celebration')),
  reward_value INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Health Profile (enhanced)
CREATE TABLE user_health_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  age INTEGER,
  gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
  height_cm INTEGER,
  weight_kg DECIMAL(5,2),
  activity_level TEXT CHECK (activity_level IN ('sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extremely_active')),
  health_goals TEXT[], -- Array of goals
  medical_conditions TEXT[],
  medications TEXT[],
  resting_heart_rate INTEGER,
  max_heart_rate INTEGER,
  vo2_max DECIMAL(4,1),
  body_fat_percentage DECIMAL(4,1),
  chronotype TEXT CHECK (chronotype IN ('lark', 'owl', 'third-bird')),
  preferred_workout_times TIME[],
  sleep_goal_hours DECIMAL(3,1) DEFAULT 8.0,
  fitness_level INTEGER CHECK (fitness_level >= 1 AND fitness_level <= 10) DEFAULT 5,
  stress_baseline INTEGER CHECK (stress_baseline >= 0 AND stress_baseline <= 100) DEFAULT 50,
  recovery_baseline INTEGER CHECK (recovery_baseline >= 0 AND recovery_baseline <= 100) DEFAULT 50,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Behavioral Change Tracking
CREATE TABLE behavior_change_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  habit_id UUID REFERENCES health_habits(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  completion_quality INTEGER CHECK (completion_quality >= 1 AND completion_quality <= 5),
  barriers_encountered TEXT[],
  triggers_used TEXT[],
  mood_before INTEGER CHECK (mood_before >= 1 AND mood_before <= 10),
  mood_after INTEGER CHECK (mood_after >= 1 AND mood_after <= 10),
  notes TEXT,
  context_location TEXT,
  context_social TEXT, -- alone, with_friends, family, etc.
  context_time_of_day TEXT,
  implementation_intention_used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for Performance
CREATE INDEX idx_circadian_data_user_date ON circadian_data(user_id, date DESC);
CREATE INDEX idx_hrv_data_user_timestamp ON hrv_data(user_id, timestamp DESC);
CREATE INDEX idx_health_habits_user_type ON health_habits(user_id, habit_type);
CREATE INDEX idx_sleep_architecture_sleep_log ON sleep_architecture(sleep_log_id);
CREATE INDEX idx_workout_biometrics_workout ON workout_biometrics(workout_log_id);
CREATE INDEX idx_chromotherapy_user ON chromotherapy_preferences(user_id);
CREATE INDEX idx_achievements_user_category ON health_achievements(user_id, achievement_category);
CREATE INDEX idx_behavior_log_habit_date ON behavior_change_log(habit_id, date DESC);

-- Enable Row Level Security
ALTER TABLE circadian_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrv_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE sleep_architecture ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_biometrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE chromotherapy_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_health_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE behavior_change_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own circadian data" ON circadian_data
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own circadian data" ON circadian_data
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own circadian data" ON circadian_data
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own HRV data" ON hrv_data
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own HRV data" ON hrv_data
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own habits" ON health_habits
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own sleep architecture" ON sleep_architecture
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sleep_logs 
      WHERE sleep_logs.id = sleep_architecture.sleep_log_id 
      AND sleep_logs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view their own workout biometrics" ON workout_biometrics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workout_logs 
      WHERE workout_logs.id = workout_biometrics.workout_log_id 
      AND workout_logs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their own color preferences" ON chromotherapy_preferences
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own achievements" ON health_achievements
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own health profile" ON user_health_profiles
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own behavior log" ON behavior_change_log
  FOR ALL USING (auth.uid() = user_id);

-- Functions for Advanced Analytics

-- Function to calculate CRDI score
CREATE OR REPLACE FUNCTION calculate_crdi_score(p_user_id UUID, p_days INTEGER DEFAULT 14)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  bedtime_variance NUMERIC;
  waketime_variance NUMERIC;
  crdi_score INTEGER;
BEGIN
  -- Calculate variance in bedtimes and waketimes
  SELECT 
    VARIANCE(EXTRACT(EPOCH FROM bedtime::time) / 3600.0),
    VARIANCE(EXTRACT(EPOCH FROM wake_time::time) / 3600.0)
  INTO bedtime_variance, waketime_variance
  FROM sleep_logs 
  WHERE user_id = p_user_id 
    AND date >= CURRENT_DATE - p_days
    AND bedtime IS NOT NULL 
    AND wake_time IS NOT NULL;
  
  -- Calculate CRDI (lower variance = higher score)
  IF bedtime_variance IS NULL OR waketime_variance IS NULL THEN
    RETURN 0;
  END IF;
  
  crdi_score := GREATEST(0, 100 - ROUND((SQRT(bedtime_variance) + SQRT(waketime_variance)) * 25));
  
  RETURN crdi_score;
END;
$$;

-- Function to update habit completion rates
CREATE OR REPLACE FUNCTION update_habit_completion_rate()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_days INTEGER;
  completed_days INTEGER;
  new_rate NUMERIC;
BEGIN
  -- Count total days since habit creation and completed days
  SELECT 
    DATE_PART('day', CURRENT_DATE - hh.created_at::date) + 1,
    COUNT(CASE WHEN bcl.completed THEN 1 END)
  INTO total_days, completed_days
  FROM health_habits hh
  LEFT JOIN behavior_change_log bcl ON bcl.habit_id = hh.id
  WHERE hh.id = COALESCE(NEW.habit_id, OLD.habit_id);
  
  -- Calculate completion rate
  new_rate := CASE WHEN total_days > 0 THEN completed_days::NUMERIC / total_days ELSE 0 END;
  
  -- Update the habit
  UPDATE health_habits 
  SET completion_rate = LEAST(1.0, new_rate),
      updated_at = NOW()
  WHERE id = COALESCE(NEW.habit_id, OLD.habit_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger to update completion rates
CREATE TRIGGER update_habit_completion_trigger
  AFTER INSERT OR UPDATE OR DELETE ON behavior_change_log
  FOR EACH ROW EXECUTE FUNCTION update_habit_completion_rate();

-- Function to check and award achievements
CREATE OR REPLACE FUNCTION check_achievements(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  workout_streak INTEGER;
  sleep_consistency INTEGER;
  total_workouts INTEGER;
BEGIN
  -- Calculate current workout streak
  SELECT COALESCE(MAX(streak), 0) INTO workout_streak
  FROM (
    SELECT COUNT(*) as streak
    FROM workout_logs
    WHERE user_id = p_user_id
      AND date >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY user_id
  ) streaks;
  
  -- Check for workout streak achievements
  IF workout_streak >= 7 THEN
    INSERT INTO health_achievements (user_id, achievement_type, achievement_category, achievement_name, achievement_description, requirement_value, current_progress, is_completed, completed_at, reward_type)
    VALUES (p_user_id, 'streak', 'exercise', '7-Day Workout Streak', 'Completed workouts for 7 consecutive days', 7, workout_streak, TRUE, NOW(), 'badge')
    ON CONFLICT DO NOTHING;
  END IF;
  
  -- Check for other achievements...
  -- (More achievement logic would go here)
END;
$$;

-- Refresh materialized view for analytics (would be called periodically)
CREATE MATERIALIZED VIEW user_health_summary AS
SELECT 
  u.id as user_id,
  u.email,
  COUNT(DISTINCT sl.date) as total_sleep_logs,
  AVG(sl.duration) as avg_sleep_duration,
  AVG(sl.quality) as avg_sleep_quality,
  COUNT(DISTINCT wl.date) as total_workouts,
  AVG(wl.duration) as avg_workout_duration,
  AVG(wl.intensity) as avg_workout_intensity,
  MAX(cd.crdi_score) as latest_crdi_score,
  AVG(hd.stress_score) as avg_stress_score,
  AVG(hd.recovery_score) as avg_recovery_score
FROM auth.users u
LEFT JOIN sleep_logs sl ON sl.user_id = u.id AND sl.date >= CURRENT_DATE - INTERVAL '30 days'
LEFT JOIN workout_logs wl ON wl.user_id = u.id AND wl.date >= CURRENT_DATE - INTERVAL '30 days'
LEFT JOIN circadian_data cd ON cd.user_id = u.id AND cd.date >= CURRENT_DATE - INTERVAL '30 days'
LEFT JOIN hrv_data hd ON hd.user_id = u.id AND hd.timestamp >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY u.id, u.email;

CREATE UNIQUE INDEX ON user_health_summary (user_id);

-- Grant permissions
GRANT SELECT ON user_health_summary TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_crdi_score(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION check_achievements(UUID) TO authenticated;

COMMIT;
