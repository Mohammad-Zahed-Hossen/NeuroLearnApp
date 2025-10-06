-- ==============================
-- NeuroLearn App - Enhanced Supabase Schema for CAE 2.0
-- Cognitive Aura Engine 2.0: Anticipatory Learning Schema
-- ==============================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
-- Note: PostGIS extension would need to be enabled in Supabase dashboard for location support
-- CREATE EXTENSION IF NOT EXISTS "postgis";

-- ==============================
-- CAE 2.0: CONTEXT SENSING TABLES
-- ==============================

-- 1. Context Snapshots - Core environmental sensing data
-- ==============================
CREATE TABLE IF NOT EXISTS context_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users ON DELETE CASCADE,
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
    -- Note: Using JSONB for coordinates instead of PostGIS POINT for Supabase compatibility
    location_coordinates JSONB, -- {latitude: number, longitude: number}
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

    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE context_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own context snapshots" ON context_snapshots FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_context_snapshots_user_id ON context_snapshots(user_id);
CREATE INDEX IF NOT EXISTS idx_context_snapshots_timestamp ON context_snapshots(timestamp);
CREATE INDEX IF NOT EXISTS idx_context_snapshots_session_id ON context_snapshots(session_id);
CREATE INDEX IF NOT EXISTS idx_context_snapshots_circadian_hour ON context_snapshots(circadian_hour);
CREATE INDEX IF NOT EXISTS idx_context_snapshots_environment ON context_snapshots(environment);
CREATE INDEX IF NOT EXISTS idx_context_snapshots_optimality ON context_snapshots(overall_optimality);

-- ==============================
-- 2. Learned Patterns - Pattern recognition and ML results
-- ==============================
CREATE TABLE IF NOT EXISTS learned_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('optimal_time', 'productive_location', 'context_sequence', 'performance_correlation')),
    pattern JSONB NOT NULL, -- Flexible pattern storage
    last_seen TIMESTAMPTZ NOT NULL,
    effectiveness DECIMAL(3,2) NOT NULL CHECK (effectiveness >= 0 AND effectiveness <= 1),
    frequency INTEGER NOT NULL DEFAULT 1,
    confidence DECIMAL(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE learned_patterns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own learned patterns" ON learned_patterns FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_learned_patterns_user_id ON learned_patterns(user_id);
CREATE INDEX IF NOT EXISTS idx_learned_patterns_type ON learned_patterns(type);
CREATE INDEX IF NOT EXISTS idx_learned_patterns_effectiveness ON learned_patterns(effectiveness);

-- ==============================
-- 3. Optimal Learning Windows - Time intelligence patterns
-- ==============================
CREATE TABLE IF NOT EXISTS optimal_learning_windows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users ON DELETE CASCADE,
    circadian_hour DECIMAL(4,2) NOT NULL CHECK (circadian_hour >= 0 AND circadian_hour < 24),
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0 = Sunday
    performance_score DECIMAL(3,2) NOT NULL CHECK (performance_score >= 0 AND performance_score <= 1),
    frequency INTEGER NOT NULL DEFAULT 1,
    last_performance DECIMAL(3,2) NOT NULL DEFAULT 0.5,
    last_seen TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Ensure uniqueness per user, hour, day combination
    UNIQUE(user_id, circadian_hour, day_of_week)
);

ALTER TABLE optimal_learning_windows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own learning windows" ON optimal_learning_windows FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_optimal_windows_user_id ON optimal_learning_windows(user_id);
CREATE INDEX IF NOT EXISTS idx_optimal_windows_hour_day ON optimal_learning_windows(circadian_hour, day_of_week);
CREATE INDEX IF NOT EXISTS idx_optimal_windows_performance ON optimal_learning_windows(performance_score);

-- ==============================
-- 4. Known Locations - Location intelligence and patterns
-- ==============================
CREATE TABLE IF NOT EXISTS known_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users ON DELETE CASCADE,
    name TEXT NOT NULL,
    -- Using JSONB for coordinates instead of PostGIS POINT for Supabase compatibility
    coordinates JSONB NOT NULL, -- {latitude: number, longitude: number}
    environment TEXT NOT NULL CHECK (environment IN ('home', 'office', 'library', 'commute', 'outdoor', 'unknown')),
    performance_history DECIMAL[] NOT NULL DEFAULT '{}', -- Array of performance scores
    average_performance DECIMAL(3,2) NOT NULL DEFAULT 0,
    visit_count INTEGER NOT NULL DEFAULT 1,
    last_visit TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE known_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own known locations" ON known_locations FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_known_locations_user_id ON known_locations(user_id);
CREATE INDEX IF NOT EXISTS idx_known_locations_environment ON known_locations(environment);
CREATE INDEX IF NOT EXISTS idx_known_locations_performance ON known_locations(average_performance);

-- ==============================
-- 5. Cognitive Forecasting - Predictive analytics results
-- ==============================
CREATE TABLE IF NOT EXISTS cognitive_forecasting (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users ON DELETE CASCADE,
    model_version TEXT NOT NULL DEFAULT 'v1.0',
    predicted_context TEXT NOT NULL,
    predicted_optimality DECIMAL(3,2) NOT NULL CHECK (predicted_optimality >= 0 AND predicted_optimality <= 1),
    prediction_horizon INTEGER NOT NULL, -- Minutes ahead
    actual_context TEXT,
    actual_optimality DECIMAL(3,2) CHECK (actual_optimality >= 0 AND actual_optimality <= 1),
    prediction_accuracy DECIMAL(3,2) CHECK (prediction_accuracy >= 0 AND prediction_accuracy <= 1),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    evaluated_at TIMESTAMPTZ
);

ALTER TABLE cognitive_forecasting ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own forecasting data" ON cognitive_forecasting FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cognitive_forecasting_user_id ON cognitive_forecasting(user_id);
CREATE INDEX IF NOT EXISTS idx_cognitive_forecasting_created ON cognitive_forecasting(created_at);
CREATE INDEX IF NOT EXISTS idx_cognitive_forecasting_horizon ON cognitive_forecasting(prediction_horizon);
CREATE INDEX IF NOT EXISTS idx_cognitive_forecasting_accuracy ON cognitive_forecasting(prediction_accuracy);

-- ==============================
-- 6. Enhanced Existing Tables for CAE 2.0 Integration
-- ==============================

-- Add CAE 2.0 fields to existing flashcards table
ALTER TABLE flashcards ADD COLUMN IF NOT EXISTS context_snapshot_id UUID REFERENCES context_snapshots(id);
ALTER TABLE flashcards ADD COLUMN IF NOT EXISTS optimal_review_context JSONB DEFAULT '{}';
ALTER TABLE flashcards ADD COLUMN IF NOT EXISTS context_performance_history JSONB DEFAULT '[]';

-- Add CAE 2.0 fields to existing logic_nodes table
ALTER TABLE logic_nodes ADD COLUMN IF NOT EXISTS context_snapshot_id UUID REFERENCES context_snapshots(id);
ALTER TABLE logic_nodes ADD COLUMN IF NOT EXISTS optimal_practice_context JSONB DEFAULT '{}';
ALTER TABLE logic_nodes ADD COLUMN IF NOT EXISTS context_difficulty_adjustment DECIMAL(3,2) DEFAULT 0;

-- Add CAE 2.0 fields to existing focus_sessions table
ALTER TABLE focus_sessions ADD COLUMN IF NOT EXISTS context_snapshot_id UUID REFERENCES context_snapshots(id);
ALTER TABLE focus_sessions ADD COLUMN IF NOT EXISTS predicted_performance DECIMAL(3,2);
ALTER TABLE focus_sessions ADD COLUMN IF NOT EXISTS context_optimization_applied BOOLEAN DEFAULT false;

-- Add CAE 2.0 fields to existing reading_sessions table
ALTER TABLE reading_sessions ADD COLUMN IF NOT EXISTS context_snapshot_id UUID REFERENCES context_snapshots(id);
ALTER TABLE reading_sessions ADD COLUMN IF NOT EXISTS reading_context_score DECIMAL(3,2) DEFAULT 0.5;
ALTER TABLE reading_sessions ADD COLUMN IF NOT EXISTS environmental_adjustments JSONB DEFAULT '{}';

-- ==============================
-- 7. CAE 2.0 Analytics Views
-- ==============================

-- View: Context effectiveness analysis
CREATE OR REPLACE VIEW context_effectiveness AS
SELECT
    user_id,
    environment,
    dbl_state,
    energy_level,
    ROUND(AVG(overall_optimality), 3) as avg_optimality,
    ROUND(AVG(context_quality_score), 3) as avg_quality,
    COUNT(*) as frequency,
    ROUND(STDDEV(overall_optimality), 3) as optimality_variance
FROM context_snapshots
GROUP BY user_id, environment, dbl_state, energy_level;

-- View: Temporal performance patterns
CREATE OR REPLACE VIEW temporal_performance AS
SELECT
    user_id,
    EXTRACT(hour FROM timestamp) as hour_of_day,
    EXTRACT(dow FROM timestamp) as day_of_week,
    time_of_day,
    energy_level,
    ROUND(AVG(overall_optimality), 3) as avg_optimality,
    ROUND(AVG(historical_performance), 3) as avg_historical_performance,
    COUNT(*) as frequency
FROM context_snapshots
GROUP BY user_id, EXTRACT(hour FROM timestamp), EXTRACT(dow FROM timestamp), time_of_day, energy_level;

-- View: Digital body language trends
CREATE OR REPLACE VIEW dbl_trends AS
SELECT
    user_id,
    dbl_state,
    ROUND(AVG(app_switch_frequency), 2) as avg_app_switches,
    ROUND(AVG(attention_span), 1) as avg_attention_span,
    ROUND(AVG(cognitive_load_indicator), 3) as avg_cognitive_load,
    ROUND(AVG(stress_indicators), 3) as avg_stress,
    ROUND(AVG(overall_optimality), 3) as avg_optimality,
    COUNT(*) as frequency
FROM context_snapshots
GROUP BY user_id, dbl_state;

-- View: Forecasting accuracy metrics
CREATE OR REPLACE VIEW forecasting_accuracy AS
SELECT
    user_id,
    model_version,
    prediction_horizon,
    ROUND(AVG(prediction_accuracy), 3) as avg_accuracy,
    ROUND(STDDEV(prediction_accuracy), 3) as accuracy_variance,
    COUNT(*) as total_predictions,
    SUM(CASE WHEN prediction_accuracy >= 0.8 THEN 1 ELSE 0 END) as high_accuracy_predictions
FROM cognitive_forecasting
WHERE prediction_accuracy IS NOT NULL
GROUP BY user_id, model_version, prediction_horizon;

-- ==============================
-- 8. CAE 2.0 Helper Functions
-- ==============================

-- Function: Get optimal learning windows for user
CREATE OR REPLACE FUNCTION get_optimal_windows(p_user_id UUID)
RETURNS TABLE (
    circadian_hour DECIMAL,
    day_of_week INTEGER,
    performance_score DECIMAL,
    frequency INTEGER,
    next_occurrence TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        olw.circadian_hour,
        olw.day_of_week,
        olw.performance_score,
        olw.frequency,
        -- Calculate next occurrence
        (
            SELECT MIN(
                CASE
                    WHEN EXTRACT(dow FROM generate_series) = olw.day_of_week
                         AND EXTRACT(hour FROM generate_series) + EXTRACT(minute FROM generate_series)/60.0 >= olw.circadian_hour
                    THEN generate_series + INTERVAL '1 hour' * (olw.circadian_hour - (EXTRACT(hour FROM generate_series) + EXTRACT(minute FROM generate_series)/60.0))
                    WHEN EXTRACT(dow FROM generate_series) > olw.day_of_week
                    THEN generate_series + INTERVAL '1 day' * (olw.day_of_week - EXTRACT(dow FROM generate_series) + 7) + INTERVAL '1 hour' * olw.circadian_hour
                    ELSE generate_series + INTERVAL '1 day' * (olw.day_of_week - EXTRACT(dow FROM generate_series)) + INTERVAL '1 hour' * olw.circadian_hour
                END
            )
            FROM generate_series(NOW(), NOW() + INTERVAL '7 days', INTERVAL '1 hour') generate_series
        ) as next_occurrence
    FROM optimal_learning_windows olw
    WHERE olw.user_id = p_user_id
    ORDER BY olw.performance_score DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get context recommendations
CREATE OR REPLACE FUNCTION get_context_recommendations(p_user_id UUID)
RETURNS TABLE (
    recommendation_type TEXT,
    recommendation TEXT,
    confidence DECIMAL,
    based_on TEXT
) AS $$
BEGIN
    RETURN QUERY
    -- Recommend best environment
    SELECT
        'environment'::TEXT,
        'Consider working in: ' || environment,
        ROUND(avg_optimality, 2),
        'Based on ' || frequency || ' previous sessions'
    FROM (
        SELECT environment, AVG(overall_optimality) as avg_optimality, COUNT(*) as frequency
        FROM context_snapshots
        WHERE user_id = p_user_id
        GROUP BY environment
        ORDER BY avg_optimality DESC
        LIMIT 1
    ) best_env

    UNION ALL

    -- Recommend optimal time
    SELECT
        'timing'::TEXT,
        'Best learning time: ' || time_of_day,
        ROUND(avg_optimality, 2),
        'Based on historical performance'
    FROM (
        SELECT time_of_day, AVG(overall_optimality) as avg_optimality
        FROM context_snapshots
        WHERE user_id = p_user_id
        GROUP BY time_of_day
        ORDER BY avg_optimality DESC
        LIMIT 1
    ) best_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================
-- 9. CAE 2.0 Triggers for Automatic Pattern Learning
-- ==============================

-- Trigger: Auto-update learning windows from context snapshots
CREATE OR REPLACE FUNCTION update_learning_windows_from_context()
RETURNS TRIGGER AS $$
BEGIN
    -- Only process high-optimality contexts
    IF NEW.overall_optimality >= 0.7 THEN
        INSERT INTO optimal_learning_windows (
            user_id,
            circadian_hour,
            day_of_week,
            performance_score,
            frequency,
            last_performance,
            last_seen
        )
        VALUES (
            NEW.user_id,
            NEW.circadian_hour,
            EXTRACT(dow FROM NEW.timestamp),
            NEW.overall_optimality,
            1,
            NEW.overall_optimality,
            NEW.timestamp
        )
        ON CONFLICT (user_id, circadian_hour, day_of_week)
        DO UPDATE SET
            performance_score = (optimal_learning_windows.performance_score * optimal_learning_windows.frequency + NEW.overall_optimality) / (optimal_learning_windows.frequency + 1),
            frequency = optimal_learning_windows.frequency + 1,
            last_performance = NEW.overall_optimality,
            last_seen = NEW.timestamp,
            updated_at = NOW();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_learning_windows
    AFTER INSERT ON context_snapshots
    FOR EACH ROW
    EXECUTE FUNCTION update_learning_windows_from_context();

-- ==============================
-- 10. Performance Optimizations & Maintenance
-- ==============================

-- Clean up old context snapshots (keep last 3 months)
CREATE OR REPLACE FUNCTION cleanup_old_context_snapshots()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM context_snapshots
    WHERE timestamp < NOW() - INTERVAL '3 months';

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================
-- ✅ CAE 2.0 Schema Complete
-- ==============================

-- This enhanced schema provides:
-- ✅ Complete context sensing data storage
-- ✅ Pattern learning and recognition tables
-- ✅ Predictive analytics support
-- ✅ Location intelligence with JSONB coordinates (Supabase compatible)
-- ✅ Automatic pattern learning triggers
-- ✅ Performance analytics views
-- ✅ Forecasting accuracy tracking
-- ✅ Integration with existing NeuroLearn tables
-- ✅ Advanced querying capabilities
-- ✅ Scalable architecture for millions of context snapshots

-- The schema supports the full CAE 2.0 feature set:
-- - Environmental context sensing
-- - Time intelligence and circadian analysis
-- - Digital body language monitoring
-- - Location-based optimization
-- - Predictive cognitive forecasting
-- - Automatic pattern recognition
-- - Performance-based learning adaptation
