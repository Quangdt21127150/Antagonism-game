-- Drop tables if they exist to ensure idempotency
DROP TABLE IF EXISTS match_histories CASCADE;
DROP TABLE IF EXISTS friend_requests CASCADE;
DROP TABLE IF EXISTS authorization CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;
DROP TABLE IF EXISTS matches CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop trigger and function if they exist
DROP TRIGGER IF EXISTS match_status_trigger ON matches;
DROP FUNCTION IF EXISTS update_user_win_lose_count;

-- Create users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(255) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  elo INTEGER DEFAULT 0,
  win_count INTEGER DEFAULT 0,
  lose_count INTEGER DEFAULT 0,
  star INTEGER DEFAULT 0
);

-- Create matches table
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  white_id UUID NOT NULL REFERENCES users(id),
  black_id UUID REFERENCES users(id),
  status VARCHAR(10) NOT NULL CHECK (status IN ('waiting', 'ongoing', 'win', 'draw', 'lose')) DEFAULT 'waiting',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  match_type INTEGER DEFAULT 0
);

-- Create match_histories table
CREATE TABLE match_histories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id),
  content JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create friend_requests table
CREATE TABLE friend_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES users(id),
  receiver_id UUID NOT NULL REFERENCES users(id),
  status VARCHAR(10) NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')) DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create authorization table
CREATE TABLE authorization (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL UNIQUE,
  access_token VARCHAR(255),
  refresh_token VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create rooms table
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id),
  match_id UUID NOT NULL REFERENCES matches(id),
  password VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create function to update win_count and lose_count
CREATE OR REPLACE FUNCTION update_user_win_lose_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.match_type = 1 AND NEW.status IN ('win', 'lose') THEN
    IF NEW.status = 'win' THEN
      -- white_id wins, black_id loses
      UPDATE users
      SET win_count = win_count + 1
      WHERE id = NEW.white_id;

      UPDATE users
      SET lose_count = lose_count + 1
      WHERE id = NEW.black_id AND NEW.black_id IS NOT NULL;
    ELSIF NEW.status = 'lose' THEN
      -- black_id wins, white_id loses
      UPDATE users
      SET win_count = win_count + 1
      WHERE id = NEW.black_id AND NEW.black_id IS NOT NULL;

      UPDATE users
      SET lose_count = lose_count + 1
      WHERE id = NEW.white_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to execute the function
CREATE OR REPLACE TRIGGER match_status_trigger
AFTER UPDATE OF status ON matches
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('win', 'lose'))
EXECUTE FUNCTION update_user_win_lose_count();