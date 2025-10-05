-- Add unique constraints for transaction_patterns and budget_history tables

-- Add unique constraint to transaction_patterns if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'transaction_patterns_user_id_description_pattern_key'
  ) THEN
    ALTER TABLE transaction_patterns ADD CONSTRAINT transaction_patterns_user_id_description_pattern_key UNIQUE (user_id, description_pattern);
  END IF;
END $$;

-- Add unique constraint to budget_history if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'budget_history_budget_id_month_year_key'
  ) THEN
    ALTER TABLE budget_history ADD CONSTRAINT budget_history_budget_id_month_year_key UNIQUE (budget_id, month_year);
  END IF;
END $$;

COMMIT;
