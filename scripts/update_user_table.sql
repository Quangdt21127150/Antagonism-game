-- Migration script to update existing users table with new fields
-- Run this if you have existing data and don't want to recreate the table

-- Add new authentication fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(255) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS facebook_id VARCHAR(255) UNIQUE;

-- Add full_name field (required field, so we set a default for existing users)
ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);

-- Update existing users to have a default full_name if they don't have one
UPDATE users SET full_name = username WHERE full_name IS NULL OR full_name = '';

-- Now make full_name NOT NULL
ALTER TABLE users ALTER COLUMN full_name SET NOT NULL;

-- Add is_banned field
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT FALSE;

-- Remove old rank-related fields if they exist (since they're not in current model)
ALTER TABLE users DROP COLUMN IF EXISTS rank;
ALTER TABLE users DROP COLUMN IF EXISTS total_rank_wins;
ALTER TABLE users DROP COLUMN IF EXISTS total_star_use;

-- Update existing users to have default values for new fields
UPDATE users SET 
  phone = NULL,
  google_id = NULL,
  facebook_id = NULL,
  is_banned = COALESCE(is_banned, FALSE)
WHERE phone IS NULL AND google_id IS NULL AND facebook_id IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN users.phone IS 'User phone number for authentication';
COMMENT ON COLUMN users.google_id IS 'Google OAuth ID';
COMMENT ON COLUMN users.facebook_id IS 'Facebook OAuth ID';
COMMENT ON COLUMN users.full_name IS 'User full display name';
COMMENT ON COLUMN users.is_banned IS 'Whether user is banned from the system';

-- Create indexes for better performance on auth fields
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_facebook_id ON users(facebook_id) WHERE facebook_id IS NOT NULL;
