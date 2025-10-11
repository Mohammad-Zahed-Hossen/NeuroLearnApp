-- Update distraction_events table schema to match DistractionService2025.ts expectations

-- Add missing columns to distraction_events table
ALTER TABLE distraction_events
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS distraction_type TEXT DEFAULT 'unknown',
ADD COLUMN IF NOT EXISTS duration_ms INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS severity TEXT DEFAULT 'low',
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS client_generated_id TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Update existing records to have default values
UPDATE distraction_events
SET
  user_id = COALESCE(user_id, '00000000-0000-0000-0000-000000000000'::UUID),
  distraction_type = COALESCE(distraction_type, 'unknown'),
  duration_ms = COALESCE(duration_ms, 0),
  severity = COALESCE(severity, 'low'),
  metadata = COALESCE(metadata, '{}'),
  created_at = COALESCE(created_at, NOW())
WHERE user_id IS NULL OR distraction_type IS NULL OR duration_ms IS NULL OR severity IS NULL OR metadata IS NULL OR created_at IS NULL;

-- Make columns NOT NULL where appropriate (after setting defaults)
-- Note: user_id and session_id remain nullable as they might be set later in some flows

COMMIT;
