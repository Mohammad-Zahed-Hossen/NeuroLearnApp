-- Migration: Add encrypted Notion token storage
-- Created: 2025-10-14
-- Description: Adds notion_token_encrypted column and migrates existing data

-- Add new encrypted column
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS notion_token_encrypted TEXT;

-- Create index for encrypted token (if needed for queries)
CREATE INDEX IF NOT EXISTS idx_user_profiles_notion_token_encrypted
ON user_profiles(notion_token_encrypted);

-- Add comment for documentation
COMMENT ON COLUMN user_profiles.notion_token_encrypted IS 'AES-256 encrypted Notion access token for secure storage';

-- Note: Data migration will be handled by application code to ensure proper encryption
-- The application will:
-- 1. Read existing notion_token values
-- 2. Encrypt them using the encryption utility
-- 3. Store in notion_token_encrypted
-- 4. Clear the plain text notion_token column
-- 5. Update code to use encrypted storage going forward
