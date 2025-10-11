-- ==============================
-- NeuroLearn App - Cognitive Sessions Table
-- For storing cognitive session logs and analytics
-- ==============================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================
-- Cognitive Sessions Table
-- ==============================
CREATE TABLE IF NOT EXISTS cognitive_sessions (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users ON DELETE CASCADE,
    log JSONB NOT NULL, -- Store the complete cognitive log data
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE cognitive_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own cognitive sessions" ON cognitive_sessions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_cognitive_sessions_user_id ON cognitive_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_cognitive_sessions_created_at ON cognitive_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_cognitive_sessions_id ON cognitive_sessions(id);

-- ==============================
-- Cognitive Sessions Analytics View
-- ==============================
CREATE OR REPLACE VIEW cognitive_sessions_analytics AS
SELECT
    user_id,
    COUNT(*) as total_sessions,
    AVG(EXTRACT(epoch FROM (updated_at - created_at))) as avg_session_duration_seconds,
    MAX(created_at) as last_session_date,
    MIN(created_at) as first_session_date
FROM cognitive_sessions
GROUP BY user_id;

-- ==============================
-- Function: Get user cognitive session summary
-- ==============================
CREATE OR REPLACE FUNCTION get_cognitive_session_summary(p_user_id UUID, p_days INTEGER DEFAULT 30)
RETURNS TABLE (
    total_sessions BIGINT,
    avg_session_duration INTERVAL,
    sessions_last_30_days BIGINT,
    most_recent_session TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT as total_sessions,
        AVG(updated_at - created_at) as avg_session_duration,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END)::BIGINT as sessions_last_30_days,
        MAX(created_at) as most_recent_session
    FROM cognitive_sessions
    WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================
-- Trigger: Auto-update updated_at timestamp
-- ==============================
CREATE OR REPLACE FUNCTION update_cognitive_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_cognitive_sessions_updated_at
    BEFORE UPDATE ON cognitive_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_cognitive_sessions_updated_at();

-- ==============================
-- ✅ Cognitive Sessions Schema Complete
-- ==============================
