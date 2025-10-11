-- ==============================
-- Security and Performance Fixes Migration
-- Fixes Supabase dashboard security and performance issues
-- ==============================

-- Migration version tracking and execution
DO $$
DECLARE
    migration_version TEXT := 'SECURITY_PERF_FIXES_1';
    current_version TEXT;
BEGIN
    -- Check if migration table exists and has RLS
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'migrations') THEN
        RAISE EXCEPTION 'Migrations table does not exist. Run previous migrations first.';
    END IF;

    -- Check current version
    SELECT version INTO current_version
    FROM migrations
    WHERE version = migration_version;

    IF current_version IS NOT NULL THEN
        RAISE NOTICE 'Migration % already applied, skipping', migration_version;
        RETURN;
    END IF;

    RAISE NOTICE 'Starting Security and Performance Fixes Migration: %', migration_version;

    -- ==============================
    -- 1. ENABLE ROW LEVEL SECURITY ON TABLES WITHOUT RLS
    -- ==============================

    -- Enable RLS on backup tables
    EXECUTE 'ALTER TABLE backup_flashcards_cae_2_0 ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE backup_logic_nodes_cae_2_0 ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE backup_focus_sessions_cae_2_0 ENABLE ROW LEVEL SECURITY';

    -- Create policies for backup tables (restrict access to service role only)
    -- Check if policy exists before creating
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'backup_flashcards_cae_2_0' AND policyname = 'Service role can manage backup_flashcards') THEN
        EXECUTE 'CREATE POLICY "Service role can manage backup_flashcards" ON backup_flashcards_cae_2_0 FOR ALL USING (auth.jwt() ->> ''role'' = ''service_role'')';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'backup_logic_nodes_cae_2_0' AND policyname = 'Service role can manage backup_logic_nodes') THEN
        EXECUTE 'CREATE POLICY "Service role can manage backup_logic_nodes" ON backup_logic_nodes_cae_2_0 FOR ALL USING (auth.jwt() ->> ''role'' = ''service_role'')';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'backup_focus_sessions_cae_2_0' AND policyname = 'Service role can manage backup_focus_sessions') THEN
        EXECUTE 'CREATE POLICY "Service role can manage backup_focus_sessions" ON backup_focus_sessions_cae_2_0 FOR ALL USING (auth.jwt() ->> ''role'' = ''service_role'')';
    END IF;

    -- Enable RLS on migrations table
    EXECUTE 'ALTER TABLE migrations ENABLE ROW LEVEL SECURITY';

    -- Create policy for migrations table (restrict to service role)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'migrations' AND policyname = 'Service role can manage migrations') THEN
        EXECUTE 'CREATE POLICY "Service role can manage migrations" ON migrations FOR ALL USING (auth.jwt() ->> ''role'' = ''service_role'')';
    END IF;

    RAISE NOTICE 'Enabled RLS on backup tables and migrations table';

    -- ==============================
    -- 2. RECREATE VIEWS WITH SECURITY INVOKER
    -- ==============================

    -- Recreate views with SECURITY INVOKER instead of SECURITY DEFINER
    EXECUTE '
    CREATE OR REPLACE VIEW context_effectiveness WITH ( security_invoker ) AS
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
    ';

    EXECUTE '
    CREATE OR REPLACE VIEW temporal_performance WITH ( security_invoker ) AS
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
    ';

    EXECUTE '
    CREATE OR REPLACE VIEW location_intelligence WITH ( security_invoker ) AS
    SELECT
        kl.user_id,
        kl.name as location_name,
        kl.environment,
        kl.average_performance,
        kl.visit_count,
        kl.last_visit,
        kl.confidence as location_confidence,
        NULL as avg_context_optimality,
        NULL as context_snapshots
    FROM known_locations kl;
    ';

    EXECUTE '
    CREATE OR REPLACE VIEW dbl_trends WITH ( security_invoker ) AS
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
    ';

    EXECUTE '
    CREATE OR REPLACE VIEW forecasting_accuracy WITH ( security_invoker ) AS
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
    ';

    RAISE NOTICE 'Recreated views with SECURITY INVOKER';

    -- ==============================
    -- 3. FIX FUNCTIONS WITH MUTABLE SEARCH_PATH
    -- ==============================

    -- Set search_path on CAE 2.0 functions
    EXECUTE 'ALTER FUNCTION get_optimal_windows(UUID) SET search_path = public';
    EXECUTE 'ALTER FUNCTION get_context_recommendations(UUID) SET search_path = public';
    EXECUTE 'ALTER FUNCTION record_context_performance(UUID, UUID, TEXT, DECIMAL, INTEGER) SET search_path = public';
    EXECUTE 'ALTER FUNCTION cleanup_old_cae_data(INTEGER) SET search_path = public';
    EXECUTE 'ALTER FUNCTION seed_default_patterns_for_user(UUID) SET search_path = public';
    EXECUTE 'ALTER FUNCTION update_learning_windows_from_context() SET search_path = public';
    EXECUTE 'ALTER FUNCTION cleanup_old_context_snapshots() SET search_path = public';
    EXECUTE 'ALTER FUNCTION update_average_performance() SET search_path = public';
    EXECUTE 'ALTER FUNCTION update_cae_statistics() SET search_path = public';

    RAISE NOTICE 'Fixed mutable search_path on functions';

    -- ==============================
    -- 4. MOVE EXTENSION TO DEDICATED SCHEMA (OPTIONAL)
    -- ==============================

    -- Create extensions schema if it doesn't exist
    EXECUTE 'CREATE SCHEMA IF NOT EXISTS extensions';

    RAISE NOTICE 'Extension btree_gin remains in public schema (migration commented out)';

    -- ==============================
    -- 5. PERFORMANCE OPTIMIZATIONS - ADD ADDITIONAL INDEXES
    -- ==============================

    -- Add indexes for performance on frequently queried columns
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_context_snapshots_user_timestamp ON context_snapshots(user_id, timestamp DESC)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_context_snapshots_user_optimality ON context_snapshots(user_id, overall_optimality DESC)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_context_snapshots_user_environment ON context_snapshots(user_id, environment)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_learned_patterns_user_effectiveness ON learned_patterns(user_id, effectiveness DESC)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_optimal_windows_user_performance ON optimal_learning_windows(user_id, performance_score DESC)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_cognitive_forecasting_user_accuracy ON cognitive_forecasting(user_id, prediction_accuracy DESC)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_cognitive_forecasting_user_horizon ON cognitive_forecasting(user_id, prediction_horizon)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_known_locations_user_performance ON known_locations(user_id, average_performance DESC)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_flashcards_context_snapshot_id ON flashcards(context_snapshot_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_flashcards_cae_version_user ON flashcards(cae_version, user_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_logic_nodes_context_snapshot_id ON logic_nodes(context_snapshot_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_logic_nodes_difficulty_user ON logic_nodes(context_difficulty_adjustment, user_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_focus_sessions_context_snapshot_id ON focus_sessions(context_snapshot_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_focus_sessions_predicted_performance ON focus_sessions(predicted_performance)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_reading_sessions_context_snapshot_id ON reading_sessions(context_snapshot_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_reading_sessions_context_score ON reading_sessions(reading_context_score)';

    RAISE NOTICE 'Added performance optimization indexes';

    -- ==============================
    -- 6. UPDATE TABLE STATISTICS
    -- ==============================

    -- Update statistics for better query planning
    EXECUTE 'ANALYZE backup_flashcards_cae_2_0';
    EXECUTE 'ANALYZE backup_logic_nodes_cae_2_0';
    EXECUTE 'ANALYZE backup_focus_sessions_cae_2_0';
    EXECUTE 'ANALYZE migrations';
    EXECUTE 'ANALYZE context_snapshots';
    EXECUTE 'ANALYZE learned_patterns';
    EXECUTE 'ANALYZE optimal_learning_windows';
    EXECUTE 'ANALYZE known_locations';
    EXECUTE 'ANALYZE cognitive_forecasting';
    EXECUTE 'ANALYZE flashcards';
    EXECUTE 'ANALYZE logic_nodes';
    EXECUTE 'ANALYZE focus_sessions';
    EXECUTE 'ANALYZE reading_sessions';

    RAISE NOTICE 'Updated table statistics for better performance';

    -- ==============================
    -- 7. RECORD MIGRATION COMPLETION
    -- ==============================

    -- Record successful migration
    EXECUTE 'INSERT INTO migrations (version, description) VALUES (''SECURITY_PERF_FIXES_1'', ''Security and Performance Fixes: Enabled RLS on backup tables, recreated views with SECURITY INVOKER, fixed function search_path, added performance indexes'')';

    RAISE NOTICE '✅ Security and Performance Fixes Migration Complete!';
    RAISE NOTICE '📋 Summary of fixes:';
    RAISE NOTICE '   - Enabled RLS on 4 tables (backup tables + migrations)';
    RAISE NOTICE '   - Recreated 5 views with SECURITY INVOKER';
    RAISE NOTICE '   - Fixed search_path on 9 functions';
    RAISE NOTICE '   - Added 15+ performance indexes';
    RAISE NOTICE '   - Updated table statistics';
    RAISE NOTICE '';
    RAISE NOTICE '🔒 Security improvements completed';
    RAISE NOTICE '⚡ Performance optimizations applied';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Enable HaveIBeenPwned password protection in Supabase dashboard (requires Team/Enterprise plan)';
    RAISE NOTICE '2. Verify fixes in Supabase security dashboard';
    RAISE NOTICE '3. Monitor query performance improvements';
END $$;

-- ==============================
-- END OF MIGRATION
-- ==============================
