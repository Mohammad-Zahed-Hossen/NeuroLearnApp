-- Add context_hash column to context_snapshots table for deduplication
-- This migration adds the missing context_hash column that the app expects

-- Add context_hash column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'context_snapshots'
        AND column_name = 'context_hash'
    ) THEN
        ALTER TABLE context_snapshots
        ADD COLUMN context_hash TEXT;

        -- Add index for performance
        CREATE INDEX IF NOT EXISTS idx_context_snapshots_context_hash
        ON context_snapshots(context_hash);

        -- Add unique constraint for deduplication
        ALTER TABLE context_snapshots
        ADD CONSTRAINT unique_context_hash_per_user
        UNIQUE (user_id, context_hash);

        RAISE NOTICE 'Added context_hash column to context_snapshots table';
    ELSE
        RAISE NOTICE 'context_hash column already exists in context_snapshots table';
    END IF;
END $$;

