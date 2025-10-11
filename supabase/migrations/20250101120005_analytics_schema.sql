-- Analytics schema for holistic intelligence tracking
CREATE TABLE analytics_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  report_id TEXT NOT NULL,
  timestamp TIMESTAMP DEFAULT NOW(),
  holistic_intelligence INTEGER DEFAULT 50,
  cognitive_performance INTEGER DEFAULT 50,
  wellness_index INTEGER DEFAULT 50,
  financial_health INTEGER DEFAULT 50,
  adaptability_index INTEGER DEFAULT 50,
  predictive_capacity INTEGER DEFAULT 50,
  report_data JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Cross-domain correlations tracking
CREATE TABLE correlation_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  metric_1 TEXT NOT NULL,
  metric_2 TEXT NOT NULL,
  correlation_coefficient DECIMAL(3,2),
  p_value DECIMAL(4,3),
  significance TEXT CHECK (significance IN ('high', 'medium', 'low', 'none')),
  sample_size INTEGER DEFAULT 0,
  calculated_at TIMESTAMP DEFAULT NOW()
);

-- Predictive analytics results
CREATE TABLE prediction_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  prediction_type TEXT NOT NULL,
  time_horizon TEXT CHECK (time_horizon IN ('1day', '1week', '1month', '3months')),
  predictions JSONB DEFAULT '[]',
  accuracy_score DECIMAL(3,2),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_analytics_reports_user_id ON analytics_reports(user_id);
CREATE INDEX idx_analytics_reports_timestamp ON analytics_reports(timestamp);
CREATE INDEX idx_correlation_analysis_user_id ON correlation_analysis(user_id);
CREATE INDEX idx_prediction_results_user_id ON prediction_results(user_id);
