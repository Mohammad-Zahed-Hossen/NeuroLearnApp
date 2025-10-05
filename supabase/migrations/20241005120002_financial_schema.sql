-- Enhanced Financial Schema with Smart Analytics
-- Builds upon your existing transactions and budgets tables

-- Add computed columns and indexes to existing transactions table
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS month_year TEXT,
ADD COLUMN IF NOT EXISTS day_of_week INTEGER,
ADD COLUMN IF NOT EXISTS description_normalized TEXT,
ADD COLUMN IF NOT EXISTS merchant_category TEXT,
ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE;

-- Create function to populate computed columns
CREATE OR REPLACE FUNCTION populate_transaction_computed_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.month_year := to_char(NEW.date, 'YYYY-MM');
  NEW.day_of_week := EXTRACT(DOW FROM NEW.date);
  RETURN NEW;
END;
$$;

-- Create trigger to populate computed columns
DROP TRIGGER IF EXISTS tr_populate_transaction_computed_columns ON transactions;
CREATE TRIGGER tr_populate_transaction_computed_columns
  BEFORE INSERT OR UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION populate_transaction_computed_columns();

-- Update existing records
UPDATE transactions SET month_year = to_char(date, 'YYYY-MM'), day_of_week = EXTRACT(DOW FROM date) WHERE month_year IS NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_month_year ON transactions(user_id, month_year);
CREATE INDEX IF NOT EXISTS idx_transactions_category_date ON transactions(user_id, category, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_amount_range ON transactions(user_id, amount) WHERE amount > 0;

-- Enhanced budget tracking with historical data
CREATE TABLE IF NOT EXISTS budget_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  budget_id UUID REFERENCES budgets(id) ON DELETE CASCADE,
  month_year TEXT NOT NULL,
  target_amount DECIMAL(12,2),
  actual_amount DECIMAL(12,2),
  utilization_percent DECIMAL(5,2),
  variance DECIMAL(12,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add unique constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'budget_history_budget_id_month_year_key'
  ) THEN
    ALTER TABLE budget_history ADD CONSTRAINT budget_history_budget_id_month_year_key UNIQUE (budget_id, month_year);
  END IF;
END $$;

-- Smart categorization suggestions
CREATE TABLE IF NOT EXISTS transaction_patterns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  description_pattern TEXT NOT NULL,
  suggested_category TEXT NOT NULL,
  confidence_score DECIMAL(3,2) DEFAULT 0.0,
  usage_count INTEGER DEFAULT 1,
  last_used TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add unique constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'transaction_patterns_user_id_description_pattern_key'
  ) THEN
    ALTER TABLE transaction_patterns ADD CONSTRAINT transaction_patterns_user_id_description_pattern_key UNIQUE (user_id, description_pattern);
  END IF;
END $$;

-- Financial analytics and insights cache
CREATE TABLE IF NOT EXISTS financial_insights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  insight_type TEXT CHECK (insight_type IN ('spending_pattern', 'budget_alert', 'forecast', 'recommendation')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority INTEGER DEFAULT 1 CHECK (priority BETWEEN 1 AND 5),
  is_read BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI conversation history for persistent chat
CREATE TABLE IF NOT EXISTS ai_conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID DEFAULT gen_random_uuid(),
  role TEXT CHECK (role IN ('user', 'assistant')),
  message TEXT NOT NULL,
  context_data JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Smart Budget Analysis Function
CREATE OR REPLACE FUNCTION analyze_budget_performance(p_user_id UUID, p_month_year TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_month TEXT;
  result JSONB;
BEGIN
  target_month := COALESCE(p_month_year, TO_CHAR(NOW(), 'YYYY-MM'));

  WITH budget_analysis AS (
    SELECT
      b.category,
      b.amount as budget_limit,
      COALESCE(SUM(t.amount), 0) as spent,
      CASE
        WHEN b.amount > 0 THEN (COALESCE(SUM(t.amount), 0) / b.amount) * 100
        ELSE 0
      END as utilization,
      CASE
        WHEN COALESCE(SUM(t.amount), 0) > b.amount THEN 'over_budget'
        WHEN (COALESCE(SUM(t.amount), 0) / b.amount) * 100 > 90 THEN 'critical'
        WHEN (COALESCE(SUM(t.amount), 0) / b.amount) * 100 > 70 THEN 'warning'
        ELSE 'healthy'
      END as status
    FROM budgets b
    LEFT JOIN transactions t ON b.category = t.category
      AND t.user_id = b.user_id
      AND t.type = 'expense'
      AND t.month_year = target_month
    WHERE b.user_id = p_user_id AND b.is_active = TRUE
    GROUP BY b.category, b.amount
  )
  SELECT JSONB_BUILD_OBJECT(
    'overall_health', CASE
      WHEN COUNT(*) FILTER (WHERE status IN ('over_budget', 'critical')) > 0 THEN 'poor'
      WHEN COUNT(*) FILTER (WHERE status = 'warning') > 0 THEN 'moderate'
      ELSE 'good'
    END,
    'categories', JSONB_AGG(
      JSONB_BUILD_OBJECT(
        'category', category,
        'budget_limit', budget_limit,
        'spent', spent,
        'utilization', ROUND(utilization, 1),
        'status', status
      )
    ),
    'alerts', (
      SELECT JSONB_AGG(
        CASE status
          WHEN 'over_budget' THEN 'You are over budget in ' || category || ' by ৳' || ROUND(spent - budget_limit)
          WHEN 'critical' THEN 'Critical: ' || category || ' is at ' || ROUND(utilization) || '% of budget'
          WHEN 'warning' THEN 'Warning: ' || category || ' is at ' || ROUND(utilization) || '% of budget'
        END
      ) FILTER (WHERE status IN ('over_budget', 'critical', 'warning'))
    )
  ) INTO result
  FROM budget_analysis;

  RETURN result;
END;
$$;

-- Exponential Smoothing Forecast Function (ETS Algorithm)
CREATE OR REPLACE FUNCTION forecast_category_spending(p_user_id UUID, p_category TEXT, p_months INTEGER DEFAULT 3)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  historical_data DECIMAL[];
  forecast_data JSONB[];
  alpha DECIMAL := 0.3;  -- Smoothing parameter
  trend DECIMAL;
  last_value DECIMAL;
  forecasted_value DECIMAL;
  confidence DECIMAL;
  month_name TEXT;
BEGIN
  -- Get historical monthly spending for the category
  SELECT ARRAY_AGG(monthly_amount ORDER BY month_year)
  INTO historical_data
  FROM (
    SELECT
      month_year,
      SUM(amount) as monthly_amount
    FROM transactions
    WHERE user_id = p_user_id
      AND category = p_category
      AND type = 'expense'
      AND month_year >= TO_CHAR(NOW() - INTERVAL '12 months', 'YYYY-MM')
    GROUP BY month_year
    ORDER BY month_year
  ) t;

  -- Need at least 3 months of data for forecasting
  IF array_length(historical_data, 1) < 3 THEN
    RETURN '{"error": "Insufficient historical data", "required_months": 3}';
  END IF;

  -- Calculate trend (simple linear trend from last 3 months)
  last_value := historical_data[array_upper(historical_data, 1)];
  trend := (historical_data[array_upper(historical_data, 1)] - historical_data[array_upper(historical_data, 1) - 2]) / 2.0;

  -- Generate forecasts
  FOR i IN 1..p_months LOOP
    forecasted_value := GREATEST(0, last_value + (trend * i));
    confidence := GREATEST(30, 90 - (i * 15)); -- Decreasing confidence

    SELECT TO_CHAR(NOW() + (i || ' months')::INTERVAL, 'Mon') INTO month_name;

    forecast_data := array_append(forecast_data,
      JSONB_BUILD_OBJECT(
        'month', month_name,
        'predicted_amount', ROUND(forecasted_value, 2),
        'confidence_percent', confidence
      )
    );
  END LOOP;

  RETURN JSONB_BUILD_OBJECT(
    'category', p_category,
    'historical_months', array_length(historical_data, 1),
    'forecasts', JSONB_AGG(forecast_data[s])
  ) FROM generate_series(1, array_length(forecast_data, 1)) s;
END;
$$;

-- Smart Transaction Categorization Function
CREATE OR REPLACE FUNCTION suggest_transaction_category(p_user_id UUID, p_description TEXT)
RETURNS TABLE(category TEXT, confidence DECIMAL)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH pattern_matches AS (
    -- Check existing patterns
    SELECT
      tp.suggested_category,
      tp.confidence_score,
      1 as match_type
    FROM transaction_patterns tp
    WHERE tp.user_id = p_user_id
      AND LOWER(p_description) LIKE '%' || LOWER(tp.description_pattern) || '%'

    UNION ALL

    -- Fallback to historical transactions
    SELECT
      t.category,
      CASE
        WHEN COUNT(*) >= 5 THEN 0.9
        WHEN COUNT(*) >= 3 THEN 0.7
        ELSE 0.5
      END as confidence_score,
      2 as match_type
    FROM transactions t
    WHERE t.user_id = p_user_id
      AND SIMILARITY(LOWER(t.description), LOWER(p_description)) > 0.3
    GROUP BY t.category
    HAVING COUNT(*) >= 2
  )
  SELECT
    pm.suggested_category as category,
    MAX(pm.confidence_score) as confidence
  FROM pattern_matches pm
  GROUP BY pm.suggested_category
  ORDER BY MAX(pm.confidence_score) DESC, MIN(pm.match_type) ASC
  LIMIT 3;
END;
$$;

-- Trigger to normalize transaction descriptions and update patterns
CREATE OR REPLACE FUNCTION update_transaction_patterns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Normalize description
  NEW.description_normalized := LOWER(TRIM(REGEXP_REPLACE(NEW.description, '[^a-zA-Z0-9\s]', ' ', 'g')));

  -- Update or create transaction pattern
  INSERT INTO transaction_patterns (user_id, description_pattern, suggested_category, confidence_score, usage_count)
  VALUES (NEW.user_id, NEW.description_normalized, NEW.category, 0.8, 1)
  ON CONFLICT (user_id, description_pattern)
  DO UPDATE SET
    usage_count = transaction_patterns.usage_count + 1,
    confidence_score = LEAST(0.95, transaction_patterns.confidence_score + 0.05),
    last_used = NOW();

  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS tr_update_transaction_patterns ON transactions;
CREATE TRIGGER tr_update_transaction_patterns
  BEFORE INSERT OR UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_transaction_patterns();

-- Budget performance tracking trigger
CREATE OR REPLACE FUNCTION track_budget_performance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  budget_rec RECORD;
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
    AND is_active = TRUE
  LIMIT 1;

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

  -- Insert budget history record
  INSERT INTO budget_history (budget_id, month_year, target_amount, actual_amount, utilization_percent, variance)
  VALUES (
    budget_rec.id,
    NEW.month_year,
    budget_rec.amount,
    current_spending,
    utilization,
    current_spending - budget_rec.amount
  )
  ON CONFLICT (budget_id, month_year)
  DO UPDATE SET
    actual_amount = current_spending,
    utilization_percent = utilization,
    variance = current_spending - budget_rec.amount;

  -- Generate insights if over budget thresholds
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

-- Create budget tracking trigger
DROP TRIGGER IF EXISTS tr_track_budget_performance ON transactions;
CREATE TRIGGER tr_track_budget_performance
  AFTER INSERT OR UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION track_budget_performance();

-- Enable RLS
ALTER TABLE budget_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DO $$
BEGIN
  CREATE POLICY "Users can manage their own budget history" ON budget_history
    FOR ALL USING (
      EXISTS (
        SELECT 1 FROM budgets b
        WHERE b.id = budget_history.budget_id
        AND b.user_id = auth.uid()
      )
    );
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Users can manage their own transaction patterns" ON transaction_patterns
    FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Users can manage their own financial insights" ON financial_insights
    FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Users can manage their own AI conversations" ON ai_conversations
    FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION analyze_budget_performance(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION forecast_category_spending(UUID, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION suggest_transaction_category(UUID, TEXT) TO authenticated;

COMMIT;
