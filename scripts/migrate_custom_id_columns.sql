-- Migration to add custom_id columns for backward compatibility
-- Run this on your Supabase SQL editor

-- Add custom_id to logic_nodes table
ALTER TABLE logic_nodes
ADD COLUMN IF NOT EXISTS custom_id TEXT UNIQUE;

-- Add custom_id to focus_sessions table
ALTER TABLE focus_sessions
ADD COLUMN IF NOT EXISTS custom_id TEXT UNIQUE;

-- Add custom_id to distraction_events table (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'distraction_events') THEN
        ALTER TABLE distraction_events
        ADD COLUMN IF NOT EXISTS custom_id TEXT UNIQUE;
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_logic_nodes_custom_id ON logic_nodes(custom_id);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_custom_id ON focus_sessions(custom_id);
CREATE INDEX IF NOT EXISTS idx_distraction_events_custom_id ON distraction_events(custom_id);

-- Optional: Migrate existing data (run this only once)
-- This will populate custom_id with legacy IDs for existing records
-- UPDATE logic_nodes SET custom_id = id WHERE custom_id IS NULL AND id LIKE 'logic_%';
-- UPDATE focus_sessions SET custom_id = id WHERE custom_id IS NULL AND id LIKE 'focus_%';

COMMIT;
