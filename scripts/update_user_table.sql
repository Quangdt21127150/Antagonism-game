-- Migration script to update existing users table with new fields
-- Run this if you have existing data and don't want to recreate the table

-- Add new authentication fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(255) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS facebook_id VARCHAR(255) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(255);

-- Add full_name field (required field, so we set a default for existing users)
ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);

-- Update existing users to have a default full_name if they don't have one
UPDATE users SET full_name = username WHERE full_name IS NULL OR full_name = '';

-- Now make full_name NOT NULL
ALTER TABLE users ALTER COLUMN full_name SET NOT NULL;

-- Add new game statistics fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_matches INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS wins INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS losses INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS win_rate DECIMAL(5,2) DEFAULT 0.0;

-- Rename old win/lose count columns if they exist
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='win_count') THEN
        ALTER TABLE users RENAME COLUMN win_count TO wins;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='lose_count') THEN
        ALTER TABLE users RENAME COLUMN lose_count TO losses;
    END IF;
END $$;

-- Add user profile fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;

-- Add skin selection fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS selected_piece_skin UUID;
ALTER TABLE users ADD COLUMN IF NOT EXISTS selected_board_skin UUID;
ALTER TABLE users ADD COLUMN IF NOT EXISTS selected_background_skin UUID;
ALTER TABLE users ADD COLUMN IF NOT EXISTS selected_effect_skin UUID;

-- Update total_matches and win_rate for existing users
UPDATE users SET 
  total_matches = COALESCE(wins, 0) + COALESCE(losses, 0),
  win_rate = CASE 
    WHEN COALESCE(wins, 0) + COALESCE(losses, 0) > 0 
    THEN ROUND((COALESCE(wins, 0)::DECIMAL / (COALESCE(wins, 0) + COALESCE(losses, 0))) * 100, 2)
    ELSE 0.0 
  END
WHERE total_matches = 0;

-- Update existing users to have default values for new fields
UPDATE users SET 
  phone = NULL,
  google_id = NULL,
  facebook_id = NULL,
  avatar_url = NULL,
  is_banned = COALESCE(is_banned, FALSE),
  total_matches = COALESCE(total_matches, 0),
  wins = COALESCE(wins, 0),
  losses = COALESCE(losses, 0),
  win_rate = COALESCE(win_rate, 0.0)
WHERE phone IS NULL AND google_id IS NULL AND facebook_id IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN users.phone IS 'User phone number for authentication';
COMMENT ON COLUMN users.google_id IS 'Google OAuth ID';
COMMENT ON COLUMN users.facebook_id IS 'Facebook OAuth ID';
COMMENT ON COLUMN users.avatar_url IS 'User profile picture URL';
COMMENT ON COLUMN users.full_name IS 'User full display name';
COMMENT ON COLUMN users.total_matches IS 'Total number of matches played';
COMMENT ON COLUMN users.wins IS 'Total number of wins';
COMMENT ON COLUMN users.losses IS 'Total number of losses';
COMMENT ON COLUMN users.win_rate IS 'Win rate percentage';
COMMENT ON COLUMN users.is_banned IS 'Whether user is banned from the system';
COMMENT ON COLUMN users.last_login IS 'Last login timestamp';
COMMENT ON COLUMN users.selected_piece_skin IS 'Selected piece skin UUID';
COMMENT ON COLUMN users.selected_board_skin IS 'Selected board skin UUID';
COMMENT ON COLUMN users.selected_background_skin IS 'Selected background skin UUID';
COMMENT ON COLUMN users.selected_effect_skin IS 'Selected effect skin UUID';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_facebook_id ON users(facebook_id) WHERE facebook_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login) WHERE last_login IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_win_rate ON users(win_rate);
CREATE INDEX IF NOT EXISTS idx_users_total_matches ON users(total_matches);
