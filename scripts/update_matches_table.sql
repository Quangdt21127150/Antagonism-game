-- Migration script to add ELO tracking and timing fields to matches table
-- Run this if you have existing data and don't want to recreate the table

-- Add ELO tracking fields
ALTER TABLE matches ADD COLUMN IF NOT EXISTS white_elo_before INTEGER;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS black_elo_before INTEGER;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS white_elo_after INTEGER;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS black_elo_after INTEGER;

-- Add timing fields
ALTER TABLE matches ADD COLUMN IF NOT EXISTS started_at TIMESTAMP;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;

-- Update existing completed matches to have completed_at timestamp
UPDATE matches 
SET completed_at = created_at 
WHERE status IN ('win', 'draw', 'lose') AND completed_at IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN matches.white_elo_before IS 'White player ELO before the match';
COMMENT ON COLUMN matches.black_elo_before IS 'Black player ELO before the match';
COMMENT ON COLUMN matches.white_elo_after IS 'White player ELO after the match';
COMMENT ON COLUMN matches.black_elo_after IS 'Black player ELO after the match';
COMMENT ON COLUMN matches.started_at IS 'Timestamp when match actually started';
COMMENT ON COLUMN matches.completed_at IS 'Timestamp when match was completed';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_matches_started_at ON matches(started_at) WHERE started_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_matches_completed_at ON matches(completed_at) WHERE completed_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_matches_status_type ON matches(status, match_type);
