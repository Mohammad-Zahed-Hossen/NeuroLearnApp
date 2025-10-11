-- ==============================
-- Synapse Builder Schema Migration
-- Neural plasticity and micro-learning tables
-- ==============================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================
-- 1. Synapse Edges Table
-- ==============================
CREATE TABLE IF NOT EXISTS synapse_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  source_node_id TEXT NOT NULL,
  target_node_id TEXT NOT NULL,
  strength DECIMAL(3,2) NOT NULL DEFAULT 0.5 CHECK (strength >= 0 AND strength <= 1),
  last_practice_date TIMESTAMP DEFAULT NOW(),
  practice_count INTEGER DEFAULT 0,
  retention_rate DECIMAL(3,2) DEFAULT 0.6 CHECK (retention_rate >= 0 AND retention_rate <= 1),
  plasticity_score DECIMAL(3,2) DEFAULT 0.5 CHECK (plasticity_score >= 0 AND plasticity_score <= 1),
  urgency_level TEXT CHECK (urgency_level IN ('critical', 'moderate', 'stable')),
  connection_type TEXT CHECK (connection_type IN ('association', 'prerequisite', 'similarity', 'logical', 'temporal')),
  micro_tasks_generated INTEGER DEFAULT 0,
  strength_history JSONB DEFAULT '[]',
  neural_pathways TEXT[] DEFAULT '{}',
  cognitive_load DECIMAL(3,2) DEFAULT 0.5 CHECK (cognitive_load >= 0 AND cognitive_load <= 1),
  last_review_result TEXT CHECK (last_review_result IN ('success', 'partial', 'failed')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ==============================
-- 2. Neuroplasticity Sessions Table
-- ==============================
CREATE TABLE IF NOT EXISTS neuroplasticity_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_type TEXT CHECK (session_type IN ('synapse_strengthening', 'pathway_building', 'cluster_integration')),
  target_edge_ids TEXT[] DEFAULT '{}',
  start_time TIMESTAMP DEFAULT NOW(),
  end_time TIMESTAMP,
  completed_tasks INTEGER DEFAULT 0,
  success_rate DECIMAL(3,2) DEFAULT 0 CHECK (success_rate >= 0 AND success_rate <= 1),
  cognitive_strain DECIMAL(3,2) DEFAULT 0.5 CHECK (cognitive_strain >= 0 AND cognitive_strain <= 1),
  plasticity_gains JSONB DEFAULT '[]',
  adaptations_triggered TEXT[] DEFAULT '{}',
  next_session_recommendations TEXT[] DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- ==============================
-- 3. Micro Tasks Table
-- ==============================
CREATE TABLE IF NOT EXISTS micro_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  edge_id UUID REFERENCES synapse_edges(id) ON DELETE CASCADE,
  task_type TEXT CHECK (task_type IN ('recall', 'connect', 'synthesize', 'apply', 'create')),
  source_node_content JSONB,
  target_node_content JSONB,
  prompt TEXT NOT NULL,
  expected_response TEXT,
  difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  estimated_time_minutes INTEGER DEFAULT 5,
  cognitive_skills TEXT[] DEFAULT '{}',
  plasticity_benefit DECIMAL(3,2) DEFAULT 0.1 CHECK (plasticity_benefit >= 0 AND plasticity_benefit <= 1),
  adaptive_hints TEXT[] DEFAULT '{}',
  success_criteria TEXT[] DEFAULT '{}',
  user_response TEXT,
  completed_at TIMESTAMP,
  success_result BOOLEAN,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ==============================
-- 4. Plasticity Tracking Table
-- ==============================
CREATE TABLE IF NOT EXISTS plasticity_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  timestamp TIMESTAMP DEFAULT NOW(),
  total_synapses INTEGER DEFAULT 0,
  average_strength DECIMAL(3,2) DEFAULT 0.5 CHECK (average_strength >= 0 AND average_strength <= 1),
  average_retention DECIMAL(3,2) DEFAULT 0.6 CHECK (average_retention >= 0 AND average_retention <= 1),
  critical_count INTEGER DEFAULT 0,
  plasticity_score INTEGER DEFAULT 50 CHECK (plasticity_score >= 0 AND plasticity_score <= 100),
  metrics JSONB DEFAULT '{}'
);

-- ==============================
-- 5. Performance Indexes
-- ==============================
CREATE INDEX IF NOT EXISTS idx_synapse_edges_user_id ON synapse_edges(user_id);
CREATE INDEX IF NOT EXISTS idx_synapse_edges_urgency ON synapse_edges(urgency_level);
CREATE INDEX IF NOT EXISTS idx_synapse_edges_strength ON synapse_edges(strength);
CREATE INDEX IF NOT EXISTS idx_synapse_edges_connection_type ON synapse_edges(connection_type);
CREATE INDEX IF NOT EXISTS idx_synapse_edges_last_practice ON synapse_edges(last_practice_date DESC);

CREATE INDEX IF NOT EXISTS idx_neuroplasticity_sessions_user_id ON neuroplasticity_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_neuroplasticity_sessions_start_time ON neuroplasticity_sessions(start_time DESC);
CREATE INDEX IF NOT EXISTS idx_neuroplasticity_sessions_type ON neuroplasticity_sessions(session_type);

CREATE INDEX IF NOT EXISTS idx_micro_tasks_user_id ON micro_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_micro_tasks_edge_id ON micro_tasks(edge_id);
CREATE INDEX IF NOT EXISTS idx_micro_tasks_task_type ON micro_tasks(task_type);
CREATE INDEX IF NOT EXISTS idx_micro_tasks_difficulty ON micro_tasks(difficulty);
CREATE INDEX IF NOT EXISTS idx_micro_tasks_completed_at ON micro_tasks(completed_at);

CREATE INDEX IF NOT EXISTS idx_plasticity_history_user_id ON plasticity_history(user_id);
CREATE INDEX IF NOT EXISTS idx_plasticity_history_timestamp ON plasticity_history(timestamp DESC);

-- ==============================
-- 6. Row Level Security (RLS)
-- ==============================
ALTER TABLE synapse_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE neuroplasticity_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE micro_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE plasticity_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage own synapse edges" ON synapse_edges
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own neuroplasticity sessions" ON neuroplasticity_sessions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own micro tasks" ON micro_tasks
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own plasticity history" ON plasticity_history
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ==============================
-- 7. Triggers for Auto-Updates
-- ==============================
CREATE OR REPLACE FUNCTION update_synapse_edges_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_synapse_edges_updated_at
  BEFORE UPDATE ON synapse_edges
  FOR EACH ROW
  EXECUTE FUNCTION update_synapse_edges_updated_at();

-- ==============================
-- 8. Helper Functions
-- ==============================

-- Function: Get synapse strength statistics for user
CREATE OR REPLACE FUNCTION get_synapse_statistics(p_user_id UUID)
RETURNS TABLE (
  total_synapses BIGINT,
  average_strength DECIMAL,
  critical_synapses BIGINT,
  weak_synapses BIGINT,
  recent_practice_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_synapses,
    ROUND(AVG(strength), 3) as average_strength,
    COUNT(*) FILTER (WHERE urgency_level = 'critical')::BIGINT as critical_synapses,
    COUNT(*) FILTER (WHERE strength < 0.3)::BIGINT as weak_synapses,
    COUNT(*) FILTER (WHERE last_practice_date >= NOW() - INTERVAL '7 days')::BIGINT as recent_practice_count
  FROM synapse_edges
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get recommended micro tasks
CREATE OR REPLACE FUNCTION get_recommended_micro_tasks(p_user_id UUID, p_limit INTEGER DEFAULT 5)
RETURNS TABLE (
  task_id UUID,
  edge_id UUID,
  task_type TEXT,
  prompt TEXT,
  difficulty TEXT,
  estimated_time INTEGER,
  plasticity_benefit DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    mt.id as task_id,
    mt.edge_id,
    mt.task_type,
    mt.prompt,
    mt.difficulty,
    mt.estimated_time_minutes,
    mt.plasticity_benefit
  FROM micro_tasks mt
  JOIN synapse_edges se ON mt.edge_id = se.id
  WHERE mt.user_id = p_user_id
    AND mt.completed_at IS NULL
    AND se.urgency_level IN ('critical', 'moderate')
  ORDER BY
    CASE se.urgency_level
      WHEN 'critical' THEN 1
      WHEN 'moderate' THEN 2
      ELSE 3
    END,
    se.strength ASC,
    mt.plasticity_benefit DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================
-- Migration Complete
-- ==============================
