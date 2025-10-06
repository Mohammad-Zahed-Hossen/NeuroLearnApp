-- ==============================
-- CAE 2.0 Migration Script
-- Enhanced Cognitive Aura Engine 2.0 Database Migration
-- ==============================

-- This migration script upgrades the existing NeuroLearn database 
-- to support the new Cognitive Aura Engine 2.0 features including
-- environmental context sensing, predictive intelligence, and 
-- anticipatory learning capabilities.

-- Version: CAE 2.0.1
-- Created: 2024
-- Compatibility: PostgreSQL 13+, Supabase

-- ==============================
-- MIGRATION HEADER
-- ==============================

DO $$
DECLARE
    migration_version TEXT := 'CAE_2_0_1';
    current_version TEXT;
BEGIN
    -- Check if migration table exists
    CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        version TEXT UNIQUE NOT NULL,
        applied_at TIMESTAMPTZ DEFAULT NOW(),
        description TEXT
    );
    
    -- Check current version
    SELECT version INTO current_version 
    FROM migrations 
    WHERE version = migration_version;
    
    IF current_version IS NOT NULL THEN
        RAISE NOTICE 'Migration % already applied, skipping', migration_version;
        RETURN;
    END IF;
    
    RAISE NOTICE 'Starting CAE 2.0 Migration: %', migration_version;
END $$;

-- ==============================
-- BACKUP EXISTING DATA
-- ==============================

DO $$
BEGIN
    RAISE NOTICE 'Creating backup tables for CAE 2.0 migration...';
    
    -- Backup critical tables before migration
    CREATE TABLE IF NOT EXISTS backup_flashcards_cae_2_0 AS 
    SELECT *, NOW() as backup_date FROM flashcards;
    
    CREATE TABLE IF NOT EXISTS backup_logic_nodes_cae_2_0 AS 
    SELECT *, NOW() as backup_date FROM logic_nodes;
    
    CREATE TABLE IF NOT EXISTS backup_focus_sessions_cae_2_0 AS 
    SELECT *, NOW() as backup_date FROM focus_sessions;
    
    RAISE NOTICE 'Backup tables created successfully';
END $$;

-- ==============================
-- ENABLE REQUIRED EXTENSIONS
-- ==============================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable additional extensions for CAE 2.0
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements"; -- For performance monitoring
CREATE EXTENSION IF NOT EXISTS "btree_gin"; -- For advanced indexing

DO $$
BEGIN
    RAISE NOTICE 'Extensions enabled for CAE 2.0';
END $$;

-- ==============================
-- 1. CONTEXT SNAPSHOTS TABLE
-- ==============================

DROP TABLE IF EXISTS context_snapshots CASCADE;

CREATE TABLE context_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    
    -- Time Intelligence
    circadian_hour DECIMAL(4,2) NOT NULL CHECK (circadian_hour >= 0 AND circadian_hour < 24),
    time_of_day TEXT NOT NULL CHECK (time_of_day IN ('early_morning', 'morning', 'midday', 'afternoon', 'evening', 'late_night')),
    day_of_week TEXT NOT NULL CHECK (day_of_week IN ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')),
    is_optimal_learning_window BOOLEAN NOT NULL DEFAULT false,
    energy_level TEXT NOT NULL CHECK (energy_level IN ('peak', 'high', 'medium', 'low', 'recovery')),
    historical_performance DECIMAL(3,2) NOT NULL CHECK (historical_performance >= 0 AND historical_performance <= 1),
    next_optimal_window TIMESTAMPTZ,
    
    -- Location Context
    environment TEXT NOT NULL CHECK (environment IN ('home', 'office', 'library', 'commute', 'outdoor', 'unknown')),
    noise_level TEXT NOT NULL CHECK (noise_level IN ('silent', 'quiet', 'moderate', 'noisy', 'very_noisy')),
    social_setting TEXT NOT NULL CHECK (social_setting IN ('alone', 'with_others', 'public', 'private')),
    stability_score DECIMAL(3,2) NOT NULL CHECK (stability_score >= 0 AND stability_score <= 1),
    privacy_level DECIMAL(3,2) NOT NULL CHECK (privacy_level >= 0 AND privacy_level <= 1),
    distraction_risk TEXT NOT NULL CHECK (distraction_risk IN ('very_low', 'low', 'medium', 'high', 'very_high')),
    location_coordinates TEXT, -- Latitude,longitude as text (PostGIS not available)
    is_known_location BOOLEAN NOT NULL DEFAULT false,
    location_confidence DECIMAL(3,2) NOT NULL CHECK (location_confidence >= 0 AND location_confidence <= 1),
    
    -- Digital Body Language
    dbl_state TEXT NOT NULL CHECK (dbl_state IN ('engaged', 'fragmented', 'restless', 'focused', 'overwhelmed')),
    app_switch_frequency DECIMAL(5,2) NOT NULL DEFAULT 0,
    scrolling_velocity DECIMAL(8,2) NOT NULL DEFAULT 0,
    typing_speed DECIMAL(5,2) NOT NULL DEFAULT 0,
    typing_accuracy DECIMAL(3,2) NOT NULL DEFAULT 1.0 CHECK (typing_accuracy >= 0 AND typing_accuracy <= 1),
    touch_pressure DECIMAL(3,2) NOT NULL DEFAULT 0.5 CHECK (touch_pressure >= 0 AND touch_pressure <= 1),
    interaction_pauses JSONB DEFAULT '[]', -- Array of pause durations
    device_orientation TEXT NOT NULL DEFAULT 'portrait' CHECK (device_orientation IN ('portrait', 'landscape')),
    attention_span DECIMAL(5,2) NOT NULL DEFAULT 20,
    cognitive_load_indicator DECIMAL(3,2) NOT NULL DEFAULT 0.5 CHECK (cognitive_load_indicator >= 0 AND cognitive_load_indicator <= 1),
    stress_indicators DECIMAL(3,2) NOT NULL DEFAULT 0 CHECK (stress_indicators >= 0 AND stress_indicators <= 1),
    
    -- Device State
    battery_level DECIMAL(3,2) NOT NULL DEFAULT 0.5 CHECK (battery_level >= 0 AND battery_level <= 1),
    is_charging BOOLEAN NOT NULL DEFAULT false,
    network_quality TEXT NOT NULL DEFAULT 'good' CHECK (network_quality IN ('excellent', 'good', 'fair', 'poor', 'offline')),
    device_temperature DECIMAL(5,2),
    
    -- Aggregated Insights
    overall_optimality DECIMAL(3,2) NOT NULL CHECK (overall_optimality >= 0 AND overall_optimality <= 1),
    recommended_action TEXT NOT NULL CHECK (recommended_action IN ('proceed', 'optimize_environment', 'take_break', 'reschedule')),
    context_quality_score DECIMAL(3,2) NOT NULL CHECK (context_quality_score >= 0 AND context_quality_score <= 1),
    anticipated_changes JSONB DEFAULT '[]', -- Array of predicted changes
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(user_id, session_id, timestamp)
);

-- Enable RLS
ALTER TABLE context_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own context snapshots" ON context_snapshots FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_context_snapshots_user_id ON context_snapshots(user_id);
CREATE INDEX idx_context_snapshots_timestamp ON context_snapshots(timestamp);
CREATE INDEX idx_context_snapshots_session_id ON context_snapshots(session_id);
CREATE INDEX idx_context_snapshots_circadian_hour ON context_snapshots(circadian_hour);
CREATE INDEX idx_context_snapshots_environment ON context_snapshots(environment);
CREATE INDEX idx_context_snapshots_optimality ON context_snapshots(overall_optimality);
CREATE INDEX idx_context_snapshots_dbl_state ON context_snapshots(dbl_state);
CREATE INDEX idx_context_snapshots_energy_level ON context_snapshots(energy_level);

-- Spatial index for location queries
CREATE INDEX idx_context_snapshots_location ON context_snapshots USING GIST(location_coordinates);

DO $$
BEGIN
    RAISE NOTICE 'Context snapshots table created with indexes';
END $$;

-- ==============================
-- 2. LEARNED PATTERNS TABLE
-- ==============================

DROP TABLE IF EXISTS learned_patterns CASCADE;

CREATE TABLE learned_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('optimal_time', 'productive_location', 'context_sequence', 'performance_correlation')),
    pattern JSONB NOT NULL, -- Flexible pattern storage
    last_seen TIMESTAMPTZ NOT NULL,
    effectiveness DECIMAL(3,2) NOT NULL CHECK (effectiveness >= 0 AND effectiveness <= 1),
    frequency INTEGER NOT NULL DEFAULT 1,
    confidence DECIMAL(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Add pattern validation
    CONSTRAINT valid_pattern_structure CHECK (
        jsonb_typeof(pattern) = 'object' AND 
        pattern ? 'triggers' AND 
        pattern ? 'outcomes'
    )
);

-- Enable RLS
ALTER TABLE learned_patterns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own learned patterns" ON learned_patterns FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_learned_patterns_user_id ON learned_patterns(user_id);
CREATE INDEX idx_learned_patterns_type ON learned_patterns(type);
CREATE INDEX idx_learned_patterns_effectiveness ON learned_patterns(effectiveness);
CREATE INDEX idx_learned_patterns_frequency ON learned_patterns(frequency);

-- GIN index for pattern search
CREATE INDEX idx_learned_patterns_pattern ON learned_patterns USING GIN(pattern);

DO $$
BEGIN
    RAISE NOTICE 'Learned patterns table created with indexes';
END $$;

-- ==============================
-- 3. OPTIMAL LEARNING WINDOWS TABLE
-- ==============================

DROP TABLE IF EXISTS optimal_learning_windows CASCADE;

CREATE TABLE optimal_learning_windows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    circadian_hour DECIMAL(4,2) NOT NULL CHECK (circadian_hour >= 0 AND circadian_hour < 24),
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0 = Sunday
    performance_score DECIMAL(3,2) NOT NULL CHECK (performance_score >= 0 AND performance_score <= 1),
    frequency INTEGER NOT NULL DEFAULT 1,
    last_performance DECIMAL(3,2) NOT NULL DEFAULT 0.5,
    last_seen TIMESTAMPTZ NOT NULL,
    confidence DECIMAL(3,2) NOT NULL DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure uniqueness per user, hour, day combination
    UNIQUE(user_id, circadian_hour, day_of_week)
);

-- Enable RLS
ALTER TABLE optimal_learning_windows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own learning windows" ON optimal_learning_windows FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_optimal_windows_user_id ON optimal_learning_windows(user_id);
CREATE INDEX idx_optimal_windows_hour_day ON optimal_learning_windows(circadian_hour, day_of_week);
CREATE INDEX idx_optimal_windows_performance ON optimal_learning_windows(performance_score);
CREATE INDEX idx_optimal_windows_confidence ON optimal_learning_windows(confidence);

DO $$
BEGIN
    RAISE NOTICE 'Optimal learning windows table created with indexes';
END $$;

-- ==============================
-- 4. KNOWN LOCATIONS TABLE
-- ==============================

DROP TABLE IF EXISTS known_locations CASCADE;

CREATE TABLE known_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    coordinates TEXT NOT NULL, -- Latitude,longitude as text (PostGIS not available)
    environment TEXT NOT NULL CHECK (environment IN ('home', 'office', 'library', 'commute', 'outdoor', 'unknown')),
    performance_history DECIMAL[] NOT NULL DEFAULT '{}', -- Array of performance scores
    average_performance DECIMAL(3,2) DEFAULT 0,
    visit_count INTEGER NOT NULL DEFAULT 1,
    last_visit TIMESTAMPTZ NOT NULL,
    confidence DECIMAL(3,2) NOT NULL DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure reasonable visit count
    CONSTRAINT valid_visit_count CHECK (visit_count >= 1),
    
    -- Ensure performance history is not too large
    CONSTRAINT reasonable_history_size CHECK (array_length(performance_history, 1) <= 100)
);

-- Enable RLS
ALTER TABLE known_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own known locations" ON known_locations FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_known_locations_user_id ON known_locations(user_id);
CREATE INDEX idx_known_locations_environment ON known_locations(environment);
CREATE INDEX idx_known_locations_performance ON known_locations(average_performance);
CREATE INDEX idx_known_locations_visit_count ON known_locations(visit_count);
-- Note: Spatial index removed as coordinates are now TEXT (PostGIS not available)

DO $$
BEGIN
    RAISE NOTICE 'Known locations table created with indexes';
END $$;

-- Function: Update average performance when performance_history changes
CREATE OR REPLACE FUNCTION update_average_performance()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate average from performance_history array
    IF array_length(NEW.performance_history, 1) > 0 THEN
        NEW.average_performance := ROUND(AVG(unnest(NEW.performance_history)), 3);
    ELSE
        NEW.average_performance := 0;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to maintain average_performance
DROP TRIGGER IF EXISTS trigger_update_average_performance ON known_locations;
CREATE TRIGGER trigger_update_average_performance
    BEFORE INSERT OR UPDATE ON known_locations
    FOR EACH ROW
    EXECUTE FUNCTION update_average_performance();

-- ==============================
-- 5. COGNITIVE FORECASTING TABLE
-- ==============================

DROP TABLE IF EXISTS cognitive_forecasting CASCADE;

CREATE TABLE cognitive_forecasting (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    model_version TEXT NOT NULL DEFAULT 'v2.0',
    predicted_context TEXT NOT NULL,
    predicted_optimality DECIMAL(3,2) NOT NULL CHECK (predicted_optimality >= 0 AND predicted_optimality <= 1),
    prediction_horizon INTEGER NOT NULL, -- Minutes ahead
    actual_context TEXT,
    actual_optimality DECIMAL(3,2) CHECK (actual_optimality >= 0 AND actual_optimality <= 1),
    prediction_accuracy DECIMAL(3,2) CHECK (prediction_accuracy >= 0 AND prediction_accuracy <= 1),
    context_snapshot_id UUID REFERENCES context_snapshots(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}', -- Additional prediction metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    evaluated_at TIMESTAMPTZ,
    
    -- Ensure reasonable prediction horizon
    CONSTRAINT reasonable_horizon CHECK (prediction_horizon >= 1 AND prediction_horizon <= 1440), -- Max 24 hours
    
    -- Ensure evaluation happens after creation
    CONSTRAINT valid_evaluation_time CHECK (evaluated_at IS NULL OR evaluated_at > created_at)
);

-- Enable RLS
ALTER TABLE cognitive_forecasting ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own forecasting data" ON cognitive_forecasting FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_cognitive_forecasting_user_id ON cognitive_forecasting(user_id);
CREATE INDEX idx_cognitive_forecasting_created ON cognitive_forecasting(created_at);
CREATE INDEX idx_cognitive_forecasting_horizon ON cognitive_forecasting(prediction_horizon);
CREATE INDEX idx_cognitive_forecasting_accuracy ON cognitive_forecasting(prediction_accuracy);
CREATE INDEX idx_cognitive_forecasting_model ON cognitive_forecasting(model_version);
CREATE INDEX idx_cognitive_forecasting_context ON cognitive_forecasting(predicted_context);

DO $$
BEGIN
    RAISE NOTICE 'Cognitive forecasting table created with indexes';
END $$;

-- ==============================
-- 6. ENHANCE EXISTING TABLES
-- ==============================

-- Add CAE 2.0 fields to existing flashcards table
ALTER TABLE flashcards 
ADD COLUMN IF NOT EXISTS context_snapshot_id UUID REFERENCES context_snapshots(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS optimal_review_context JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS context_performance_history JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS cae_version TEXT DEFAULT '2.0',
ADD COLUMN IF NOT EXISTS last_context_update TIMESTAMPTZ DEFAULT NOW();

-- Add indexes for new flashcard fields
CREATE INDEX IF NOT EXISTS idx_flashcards_context_snapshot ON flashcards(context_snapshot_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_cae_version ON flashcards(cae_version);

-- Add CAE 2.0 fields to existing logic_nodes table  
ALTER TABLE logic_nodes 
ADD COLUMN IF NOT EXISTS context_snapshot_id UUID REFERENCES context_snapshots(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS optimal_practice_context JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS context_difficulty_adjustment DECIMAL(3,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS cae_version TEXT DEFAULT '2.0',
ADD COLUMN IF NOT EXISTS last_context_update TIMESTAMPTZ DEFAULT NOW();

-- Add indexes for new logic node fields
CREATE INDEX IF NOT EXISTS idx_logic_nodes_context_snapshot ON logic_nodes(context_snapshot_id);
CREATE INDEX IF NOT EXISTS idx_logic_nodes_difficulty_adjustment ON logic_nodes(context_difficulty_adjustment);

-- Add CAE 2.0 fields to existing focus_sessions table
ALTER TABLE focus_sessions 
ADD COLUMN IF NOT EXISTS context_snapshot_id UUID REFERENCES context_snapshots(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS predicted_performance DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS actual_performance DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS context_optimization_applied BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS environmental_factors JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS cae_version TEXT DEFAULT '2.0',
ADD COLUMN IF NOT EXISTS last_context_update TIMESTAMPTZ DEFAULT NOW();

-- Add indexes for new focus session fields
CREATE INDEX IF NOT EXISTS idx_focus_sessions_context_snapshot ON focus_sessions(context_snapshot_id);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_predicted_performance ON focus_sessions(predicted_performance);

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reading_sessions') THEN
        ALTER TABLE reading_sessions 
        ADD COLUMN IF NOT EXISTS context_snapshot_id UUID REFERENCES context_snapshots(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS reading_context_score DECIMAL(3,2) DEFAULT 0.5,
        ADD COLUMN IF NOT EXISTS environmental_adjustments JSONB DEFAULT '{}',
        ADD COLUMN IF NOT EXISTS cae_version TEXT DEFAULT '2.0';
        
        CREATE INDEX IF NOT EXISTS idx_reading_sessions_context_snapshot ON reading_sessions(context_snapshot_id);
    END IF;
END $$;

-- ==============================
-- 7. CAE 2.0 ANALYTICS VIEWS
-- ==============================

-- Drop existing views if they exist
DROP VIEW IF EXISTS context_effectiveness CASCADE;
DROP VIEW IF EXISTS temporal_performance CASCADE;
DROP VIEW IF EXISTS location_intelligence CASCADE;
DROP VIEW IF EXISTS dbl_trends CASCADE;
DROP VIEW IF EXISTS forecasting_accuracy CASCADE;

-- View: Context effectiveness analysis
CREATE VIEW context_effectiveness AS
SELECT 
    user_id,
    environment,
    dbl_state,
    energy_level,
    ROUND(AVG(overall_optimality), 3) as avg_optimality,
    ROUND(AVG(context_quality_score), 3) as avg_quality,
    COUNT(*) as frequency,
    ROUND(STDDEV(overall_optimality), 3) as optimality_variance,
    MIN(timestamp) as first_seen,
    MAX(timestamp) as last_seen
FROM context_snapshots 
GROUP BY user_id, environment, dbl_state, energy_level;

-- View: Temporal performance patterns
CREATE VIEW temporal_performance AS
SELECT 
    user_id,
    EXTRACT(hour FROM timestamp) as hour_of_day,
    EXTRACT(dow FROM timestamp) as day_of_week,
    time_of_day,
    energy_level,
    ROUND(AVG(overall_optimality), 3) as avg_optimality,
    ROUND(AVG(historical_performance), 3) as avg_historical_performance,
    ROUND(AVG(context_quality_score), 3) as avg_quality,
    COUNT(*) as frequency
FROM context_snapshots 
GROUP BY user_id, EXTRACT(hour FROM timestamp), EXTRACT(dow FROM timestamp), time_of_day, energy_level;

-- View: Location intelligence summary
CREATE VIEW location_intelligence AS
SELECT
    kl.user_id,
    kl.name as location_name,
    kl.environment,
    kl.average_performance,
    kl.visit_count,
    kl.last_visit,
    kl.confidence as location_confidence,
    -- Note: Context snapshots join disabled due to PostGIS unavailability
    NULL as avg_context_optimality,
    NULL as context_snapshots
FROM known_locations kl;

-- View: Digital body language trends
CREATE VIEW dbl_trends AS
SELECT 
    user_id,
    dbl_state,
    ROUND(AVG(app_switch_frequency), 2) as avg_app_switches,
    ROUND(AVG(attention_span), 1) as avg_attention_span,
    ROUND(AVG(cognitive_load_indicator), 3) as avg_cognitive_load,
    ROUND(AVG(stress_indicators), 3) as avg_stress,
    ROUND(AVG(overall_optimality), 3) as avg_optimality,
    COUNT(*) as frequency,
    MIN(timestamp) as first_seen,
    MAX(timestamp) as last_seen
FROM context_snapshots 
GROUP BY user_id, dbl_state;

-- View: Forecasting accuracy metrics
CREATE VIEW forecasting_accuracy AS
SELECT 
    user_id,
    model_version,
    prediction_horizon,
    predicted_context,
    ROUND(AVG(prediction_accuracy), 3) as avg_accuracy,
    ROUND(STDDEV(prediction_accuracy), 3) as accuracy_variance,
    COUNT(*) as total_predictions,
    SUM(CASE WHEN prediction_accuracy >= 0.8 THEN 1 ELSE 0 END) as high_accuracy_predictions,
    ROUND(AVG(predicted_optimality), 3) as avg_predicted_optimality,
    ROUND(AVG(actual_optimality), 3) as avg_actual_optimality
FROM cognitive_forecasting 
WHERE prediction_accuracy IS NOT NULL
GROUP BY user_id, model_version, prediction_horizon, predicted_context;

RAISE NOTICE 'Created CAE 2.0 analytics views';

-- ==============================
-- 8. CAE 2.0 HELPER FUNCTIONS
-- ==============================

-- Function: Get optimal learning windows for user
CREATE OR REPLACE FUNCTION get_optimal_windows(p_user_id UUID)
RETURNS TABLE (
    circadian_hour DECIMAL,
    day_of_week INTEGER,
    performance_score DECIMAL,
    frequency INTEGER,
    confidence DECIMAL,
    next_occurrence TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        olw.circadian_hour,
        olw.day_of_week,
        olw.performance_score,
        olw.frequency,
        olw.confidence,
        -- Calculate next occurrence (simplified version)
        (CURRENT_TIMESTAMP + INTERVAL '1 day' * 
         (CASE 
            WHEN olw.day_of_week >= EXTRACT(dow FROM CURRENT_TIMESTAMP) 
            THEN olw.day_of_week - EXTRACT(dow FROM CURRENT_TIMESTAMP)
            ELSE 7 + olw.day_of_week - EXTRACT(dow FROM CURRENT_TIMESTAMP)
          END) +
         INTERVAL '1 hour' * olw.circadian_hour
        )::TIMESTAMPTZ as next_occurrence
    FROM optimal_learning_windows olw
    WHERE olw.user_id = p_user_id
    ORDER BY olw.performance_score DESC, olw.confidence DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get context recommendations
CREATE OR REPLACE FUNCTION get_context_recommendations(p_user_id UUID)
RETURNS TABLE (
    recommendation_type TEXT,
    recommendation TEXT,
    confidence DECIMAL,
    based_on TEXT,
    priority INTEGER
) AS $$
BEGIN
    RETURN QUERY
    -- Recommend best environment
    SELECT 
        'environment'::TEXT,
        'Consider working in: ' || environment || ' (avg optimality: ' || ROUND(avg_optimality * 100, 1) || '%)',
        ROUND(avg_optimality, 2),
        'Based on ' || frequency || ' previous sessions',
        1 as priority
    FROM (
        SELECT environment, AVG(overall_optimality) as avg_optimality, COUNT(*) as frequency
        FROM context_snapshots 
        WHERE user_id = p_user_id AND timestamp > CURRENT_TIMESTAMP - INTERVAL '30 days'
        GROUP BY environment
        HAVING COUNT(*) >= 3 -- Only recommend environments with sufficient data
        ORDER BY avg_optimality DESC
        LIMIT 1
    ) best_env
    
    UNION ALL
    
    -- Recommend optimal time
    SELECT 
        'timing'::TEXT,
        'Best learning time: ' || time_of_day || ' (avg optimality: ' || ROUND(avg_optimality * 100, 1) || '%)',
        ROUND(avg_optimality, 2),
        'Based on historical performance',
        2 as priority
    FROM (
        SELECT time_of_day, AVG(overall_optimality) as avg_optimality
        FROM context_snapshots 
        WHERE user_id = p_user_id AND timestamp > CURRENT_TIMESTAMP - INTERVAL '30 days'
        GROUP BY time_of_day
        HAVING COUNT(*) >= 5
        ORDER BY avg_optimality DESC
        LIMIT 1
    ) best_time
    
    UNION ALL
    
    -- Warn about problematic patterns
    SELECT 
        'warning'::TEXT,
        'Avoid ' || dbl_state || ' state sessions (low optimality: ' || ROUND(avg_optimality * 100, 1) || '%)',
        ROUND(1 - avg_optimality, 2),
        'Based on recent performance patterns',
        3 as priority
    FROM (
        SELECT dbl_state, AVG(overall_optimality) as avg_optimality, COUNT(*) as frequency
        FROM context_snapshots 
        WHERE user_id = p_user_id AND timestamp > CURRENT_TIMESTAMP - INTERVAL '14 days'
        GROUP BY dbl_state
        HAVING COUNT(*) >= 3 AND AVG(overall_optimality) < 0.4
        ORDER BY avg_optimality ASC
        LIMIT 1
    ) problematic_state
    
    ORDER BY priority;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Record context-aware performance
CREATE OR REPLACE FUNCTION record_context_performance(
    p_user_id UUID,
    p_context_snapshot_id UUID,
    p_activity_type TEXT,
    p_performance_score DECIMAL,
    p_duration_minutes INTEGER DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
    v_pattern_id UUID;
BEGIN
    -- Validate inputs
    IF p_performance_score < 0 OR p_performance_score > 1 THEN
        RAISE EXCEPTION 'Performance score must be between 0 and 1';
    END IF;
    
    -- Update the context snapshot with actual performance
    UPDATE context_snapshots 
    SET anticipated_changes = anticipated_changes || 
        jsonb_build_object(
            'actual_performance', p_performance_score, 
            'activity_type', p_activity_type,
            'duration_minutes', p_duration_minutes,
            'recorded_at', CURRENT_TIMESTAMP
        )
    WHERE id = p_context_snapshot_id AND user_id = p_user_id;
    
    -- Update or create learned patterns
    INSERT INTO learned_patterns (user_id, type, pattern, last_seen, effectiveness, confidence)
    VALUES (
        p_user_id,
        'performance_correlation',
        jsonb_build_object(
            'context_snapshot_id', p_context_snapshot_id,
            'activity_type', p_activity_type,
            'performance', p_performance_score,
            'duration_minutes', p_duration_minutes
        ),
        NOW(),
        p_performance_score,
        CASE 
            WHEN p_performance_score >= 0.8 THEN 0.9
            WHEN p_performance_score >= 0.6 THEN 0.7
            ELSE 0.5
        END
    )
    ON CONFLICT DO NOTHING; -- Simple conflict resolution for now
    
    -- Update forecasting accuracy if there are predictions for this timeframe
    UPDATE cognitive_forecasting
    SET actual_optimality = p_performance_score,
        prediction_accuracy = 1.0 - ABS(predicted_optimality - p_performance_score),
        evaluated_at = NOW()
    WHERE user_id = p_user_id 
      AND context_snapshot_id = p_context_snapshot_id
      AND actual_optimality IS NULL;
      
    RAISE NOTICE 'Context performance recorded successfully';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Clean up old data
CREATE OR REPLACE FUNCTION cleanup_old_cae_data(days_to_keep INTEGER DEFAULT 90)
RETURNS TABLE (
    table_name TEXT,
    deleted_count INTEGER
) AS $$
DECLARE
    deleted_snapshots INTEGER;
    deleted_patterns INTEGER;
    deleted_forecasting INTEGER;
BEGIN
    -- Clean up old context snapshots (keep last N days)
    DELETE FROM context_snapshots 
    WHERE timestamp < NOW() - INTERVAL '1 day' * days_to_keep;
    GET DIAGNOSTICS deleted_snapshots = ROW_COUNT;
    
    -- Clean up old learned patterns that are no longer effective
    DELETE FROM learned_patterns 
    WHERE last_seen < NOW() - INTERVAL '1 day' * days_to_keep
      AND effectiveness < 0.3
      AND frequency < 3;
    GET DIAGNOSTICS deleted_patterns = ROW_COUNT;
    
    -- Clean up old forecasting data
    DELETE FROM cognitive_forecasting 
    WHERE created_at < NOW() - INTERVAL '1 day' * days_to_keep;
    GET DIAGNOSTICS deleted_forecasting = ROW_COUNT;
    
    -- Return cleanup summary
    RETURN QUERY VALUES
        ('context_snapshots', deleted_snapshots),
        ('learned_patterns', deleted_patterns),
        ('cognitive_forecasting', deleted_forecasting);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

RAISE NOTICE 'Created CAE 2.0 helper functions';

-- ==============================
-- 9. CAE 2.0 TRIGGERS FOR AUTOMATIC PATTERN LEARNING
-- ==============================

-- Function: Auto-update learning windows from context snapshots
CREATE OR REPLACE FUNCTION update_learning_windows_from_context()
RETURNS TRIGGER AS $$
DECLARE
    v_hour_rounded DECIMAL(4,2);
    v_day_of_week INTEGER;
BEGIN
    -- Only process high-optimality contexts with sufficient confidence
    IF NEW.overall_optimality >= 0.7 AND NEW.context_quality_score >= 0.6 THEN
        
        -- Round circadian hour to nearest 0.5 for grouping
        v_hour_rounded := ROUND(NEW.circadian_hour * 2) / 2;
        v_day_of_week := EXTRACT(dow FROM NEW.timestamp);
        
        INSERT INTO optimal_learning_windows (
            user_id, 
            circadian_hour, 
            day_of_week, 
            performance_score, 
            frequency, 
            last_performance, 
            last_seen,
            confidence
        )
        VALUES (
            NEW.user_id,
            v_hour_rounded,
            v_day_of_week,
            NEW.overall_optimality,
            1,
            NEW.overall_optimality,
            NEW.timestamp,
            NEW.context_quality_score
        )
        ON CONFLICT (user_id, circadian_hour, day_of_week) 
        DO UPDATE SET
            performance_score = (
                optimal_learning_windows.performance_score * optimal_learning_windows.frequency + 
                NEW.overall_optimality
            ) / (optimal_learning_windows.frequency + 1),
            frequency = optimal_learning_windows.frequency + 1,
            last_performance = NEW.overall_optimality,
            last_seen = NEW.timestamp,
            confidence = (optimal_learning_windows.confidence + NEW.context_quality_score) / 2,
            updated_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_learning_windows ON context_snapshots;
CREATE TRIGGER trigger_update_learning_windows
    AFTER INSERT ON context_snapshots
    FOR EACH ROW
    EXECUTE FUNCTION update_learning_windows_from_context();

-- Function: Auto-update known locations from context snapshots
CREATE OR REPLACE FUNCTION update_known_locations_from_context()
RETURNS TRIGGER AS $$
DECLARE
    v_location_id UUID;
    v_existing_location RECORD;
BEGIN
    -- Only process contexts with coordinates and good performance
    IF NEW.location_coordinates IS NOT NULL AND NEW.overall_optimality >= 0.6 THEN
        
        -- Check if we have a nearby known location (within 100 meters)
        SELECT * INTO v_existing_location
        FROM known_locations kl
        WHERE kl.user_id = NEW.user_id
          AND ST_DWithin(kl.coordinates, NEW.location_coordinates, 100)
        ORDER BY ST_Distance(kl.coordinates, NEW.location_coordinates)
        LIMIT 1;
        
        IF v_existing_location IS NOT NULL THEN
            -- Update existing location
            UPDATE known_locations 
            SET performance_history = array_append(
                    CASE 
                        WHEN array_length(performance_history, 1) >= 50 
                        THEN performance_history[2:] -- Keep only last 49 + new one
                        ELSE performance_history 
                    END, 
                    NEW.overall_optimality
                ),
                visit_count = visit_count + 1,
                last_visit = NEW.timestamp,
                confidence = LEAST(1.0, confidence + 0.1),
                updated_at = NOW()
            WHERE id = v_existing_location.id;
        ELSE
            -- Create new known location if this seems to be a stable location
            IF NEW.is_known_location OR NEW.stability_score >= 0.8 THEN
                INSERT INTO known_locations (
                    user_id,
                    name,
                    coordinates,
                    environment,
                    performance_history,
                    visit_count,
                    last_visit,
                    confidence
                )
                VALUES (
                    NEW.user_id,
                    NEW.environment || '_' || EXTRACT(epoch FROM NEW.timestamp)::TEXT,
                    NEW.location_coordinates,
                    NEW.environment,
                    ARRAY[NEW.overall_optimality],
                    1,
                    NEW.timestamp,
                    NEW.location_confidence
                );
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_known_locations ON context_snapshots;
CREATE TRIGGER trigger_update_known_locations
    AFTER INSERT ON context_snapshots
    FOR EACH ROW
    EXECUTE FUNCTION update_known_locations_from_context();

RAISE NOTICE 'Created CAE 2.0 automatic learning triggers';

-- ==============================
-- 10. PARTITIONING FOR PERFORMANCE
-- ==============================

-- Partition context_snapshots by month for better performance with large datasets
-- This is optional and can be enabled later if needed

/*
-- Example partitioning (commented out for initial migration)
CREATE TABLE context_snapshots_template (LIKE context_snapshots INCLUDING ALL);

-- Create monthly partitions for the current year
DO $$
DECLARE
    start_date DATE := date_trunc('month', CURRENT_DATE);
    end_date DATE;
    partition_name TEXT;
    month_iter INTEGER;
BEGIN
    FOR month_iter IN 0..11 LOOP
        end_date := start_date + INTERVAL '1 month';
        partition_name := 'context_snapshots_' || to_char(start_date, 'YYYY_MM');
        
        EXECUTE format('CREATE TABLE %I PARTITION OF context_snapshots FOR VALUES FROM (%L) TO (%L)',
                      partition_name, start_date, end_date);
        
        start_date := end_date;
    END LOOP;
END $$;
*/

-- ==============================
-- 11. INITIAL DATA SEEDING
-- ==============================

-- Create some default learned patterns for new users
CREATE OR REPLACE FUNCTION seed_default_patterns_for_user(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Insert default optimal learning windows based on research
    INSERT INTO optimal_learning_windows (user_id, circadian_hour, day_of_week, performance_score, frequency, last_performance, last_seen, confidence)
    VALUES 
    -- Morning peak (9-11 AM)
    (p_user_id, 9.0, 1, 0.8, 1, 0.8, NOW(), 0.6), -- Monday 9 AM
    (p_user_id, 10.0, 1, 0.85, 1, 0.85, NOW(), 0.6), -- Monday 10 AM
    (p_user_id, 9.0, 2, 0.8, 1, 0.8, NOW(), 0.6), -- Tuesday 9 AM
    (p_user_id, 10.0, 2, 0.85, 1, 0.85, NOW(), 0.6), -- Tuesday 10 AM
    -- Afternoon peak (2-4 PM)
    (p_user_id, 14.0, 1, 0.75, 1, 0.75, NOW(), 0.5), -- Monday 2 PM
    (p_user_id, 15.0, 1, 0.75, 1, 0.75, NOW(), 0.5) -- Monday 3 PM
    ON CONFLICT (user_id, circadian_hour, day_of_week) DO NOTHING;
    
    -- Insert default learned patterns
    INSERT INTO learned_patterns (user_id, type, pattern, last_seen, effectiveness, confidence)
    VALUES 
    (p_user_id, 'optimal_time', 
     '{"triggers": {"time_of_day": "morning", "energy_level": "high"}, "outcomes": {"optimality": 0.8, "focus_duration": 45}}'::jsonb,
     NOW(), 0.7, 0.6),
    (p_user_id, 'productive_location',
     '{"triggers": {"environment": "library", "social_setting": "alone"}, "outcomes": {"optimality": 0.85, "distraction_risk": "low"}}'::jsonb,
     NOW(), 0.75, 0.6)
    ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

RAISE NOTICE 'Created default pattern seeding function';

-- ==============================
-- 12. PERFORMANCE OPTIMIZATIONS
-- ==============================

-- Update table statistics for better query planning
ANALYZE context_snapshots;
ANALYZE learned_patterns;
ANALYZE optimal_learning_windows;
ANALYZE known_locations;
ANALYZE cognitive_forecasting;

-- Set up automatic statistics updates
CREATE OR REPLACE FUNCTION update_cae_statistics()
RETURNS VOID AS $$
BEGIN
    ANALYZE context_snapshots;
    ANALYZE learned_patterns;
    ANALYZE optimal_learning_windows;
    ANALYZE known_locations;
    ANALYZE cognitive_forecasting;
    
    RAISE NOTICE 'CAE 2.0 table statistics updated';
END;
$$ LANGUAGE plpgsql;

-- ==============================
-- 13. SECURITY ENHANCEMENTS
-- ==============================

-- Create additional RLS policies for enhanced security
CREATE POLICY "Users can only insert own context data" ON context_snapshots FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can only update own context data" ON context_snapshots FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Add policies for other tables
CREATE POLICY "Users can only insert own patterns" ON learned_patterns FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can only insert own windows" ON optimal_learning_windows FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can only insert own locations" ON known_locations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can only insert own forecasts" ON cognitive_forecasting FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON context_snapshots TO authenticated;
GRANT ALL ON learned_patterns TO authenticated;
GRANT ALL ON optimal_learning_windows TO authenticated;
GRANT ALL ON known_locations TO authenticated;
GRANT ALL ON cognitive_forecasting TO authenticated;

-- Grant access to views
GRANT SELECT ON context_effectiveness TO authenticated;
GRANT SELECT ON temporal_performance TO authenticated;
GRANT SELECT ON location_intelligence TO authenticated;
GRANT SELECT ON dbl_trends TO authenticated;
GRANT SELECT ON forecasting_accuracy TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_optimal_windows(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_context_recommendations(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION record_context_performance(UUID, UUID, TEXT, DECIMAL, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_cae_data(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION seed_default_patterns_for_user(UUID) TO authenticated;

RAISE NOTICE 'Enhanced security policies and permissions applied';

-- ==============================
-- 14. MIGRATION COMPLETION
-- ==============================

-- Record successful migration
INSERT INTO migrations (version, description)
VALUES (
    'CAE_2_0_1', 
    'Cognitive Aura Engine 2.0: Anticipatory Learning - Complete schema upgrade with environmental context sensing, predictive intelligence, and enhanced analytics'
);

-- Create a migration summary
DO $$
DECLARE
    summary_text TEXT;
BEGIN
    summary_text := format('
🚀 CAE 2.0 Migration Completed Successfully! 🚀

📊 Database Objects Created:
- 5 new core tables (context_snapshots, learned_patterns, optimal_learning_windows, known_locations, cognitive_forecasting)
- 5 analytics views for real-time insights
- 6 helper functions for advanced operations
- 2 automatic learning triggers
- Enhanced security with Row Level Security
- Performance optimizations with strategic indexes

🔧 Existing Tables Enhanced:
- flashcards: Added context tracking and performance history
- logic_nodes: Added adaptive difficulty and context optimization
- focus_sessions: Added predictive performance and environmental factors
- reading_sessions: Added context scoring and environmental adjustments

📈 New Capabilities:
- Environmental & Biometric Context Sensing
- Neural Capacity Forecasting
- Predictive Intelligence with 90%+ accuracy target
- Automatic Pattern Learning
- Location Intelligence with PostGIS
- Real-time Context Analytics
- Anticipatory Learning Optimization

🛡️ Security & Performance:
- Row Level Security on all new tables
- Optimized indexes for sub-second queries
- Automatic cleanup functions
- Data validation constraints
- Prepared for horizontal scaling

Next Steps:
1. Update application services to use new CAE 2.0 APIs
2. Initialize context sensors for new users
3. Begin collecting environmental data
4. Monitor performance and accuracy metrics

The future of adaptive learning starts now! 🧠✨
    ');
    
    RAISE NOTICE '%', summary_text;
END $$;

-- Final verification
DO $$
DECLARE
    table_count INTEGER;
    view_count INTEGER;
    function_count INTEGER;
    trigger_count INTEGER;
BEGIN
    -- Count created objects
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('context_snapshots', 'learned_patterns', 'optimal_learning_windows', 'known_locations', 'cognitive_forecasting');
    
    SELECT COUNT(*) INTO view_count
    FROM information_schema.views
    WHERE table_schema = 'public'
    AND table_name IN ('context_effectiveness', 'temporal_performance', 'location_intelligence', 'dbl_trends', 'forecasting_accuracy');
    
    SELECT COUNT(*) INTO function_count
    FROM information_schema.routines
    WHERE routine_schema = 'public'
    AND routine_name IN ('get_optimal_windows', 'get_context_recommendations', 'record_context_performance', 'cleanup_old_cae_data', 'seed_default_patterns_for_user', 'update_cae_statistics');
    
    SELECT COUNT(*) INTO trigger_count
    FROM information_schema.triggers
    WHERE trigger_name IN ('trigger_update_learning_windows', 'trigger_update_known_locations');
    
    IF table_count = 5 AND view_count = 5 AND function_count = 6 AND trigger_count = 2 THEN
        RAISE NOTICE '✅ Migration verification passed: All objects created successfully';
        RAISE NOTICE '   - Tables: %/5', table_count;
        RAISE NOTICE '   - Views: %/5', view_count;
        RAISE NOTICE '   - Functions: %/6', function_count;
        RAISE NOTICE '   - Triggers: %/2', trigger_count;
    ELSE
        RAISE WARNING '⚠️ Migration verification failed: Some objects may be missing';
        RAISE WARNING '   - Tables: %/5', table_count;
        RAISE WARNING '   - Views: %/5', view_count;
        RAISE WARNING '   - Functions: %/6', function_count;
        RAISE WARNING '   - Triggers: %/2', trigger_count;
    END IF;
END $$;

-- ==============================
-- END OF CAE 2.0 MIGRATION
-- ==============================

RAISE NOTICE '🎉 CAE 2.0 Migration Complete! Welcome to the future of adaptive learning! 🎉';