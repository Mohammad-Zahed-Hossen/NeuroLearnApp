-- Add sleep_score column to sleep_logs table
-- This migration adds the missing sleep_score field that was referenced in the code

ALTER TABLE sleep_logs
ADD COLUMN IF NOT EXISTS sleep_score INTEGER CHECK (sleep_score >= 0 AND sleep_score <= 100);

-- Add sleep_debt column if it doesn't exist
ALTER TABLE sleep_logs
ADD COLUMN IF NOT EXISTS sleep_debt INTEGER DEFAULT 0;

-- Add crdi_score column if it doesn't exist
ALTER TABLE sleep_logs
ADD COLUMN IF NOT EXISTS crdi_score INTEGER CHECK (crdi_score >= 0 AND crdi_score <= 100);

-- Add estimated_cycles column if it doesn't exist
ALTER TABLE sleep_logs
ADD COLUMN IF NOT EXISTS estimated_cycles DECIMAL(3,1);

-- Add sleep_efficiency column if it doesn't exist
ALTER TABLE sleep_logs
ADD COLUMN IF NOT EXISTS sleep_efficiency DECIMAL(5,2);
