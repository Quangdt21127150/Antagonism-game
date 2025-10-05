-- Enable UUID generator
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Drop everything (idempotent)
DROP TABLE IF EXISTS match_histories  CASCADE;
DROP TABLE IF EXISTS friend_requests  CASCADE;
DROP TABLE IF EXISTS "authorization"    CASCADE;
DROP TABLE IF EXISTS rooms            CASCADE;
DROP TABLE IF EXISTS matches          CASCADE;
DROP TABLE IF EXISTS users            CASCADE;
DROP TABLE IF EXISTS items            CASCADE;
DROP TABLE IF EXISTS "Vouchers"       CASCADE;
DROP TABLE IF EXISTS voucher_redemptions CASCADE;
DROP TABLE IF EXISTS item_purchases   CASCADE;
DROP TABLE IF EXISTS payments         CASCADE;

DROP FUNCTION IF EXISTS update_user_win_lose_count CASCADE;
DROP FUNCTION IF EXISTS trg_friend_req_upd_time CASCADE;

/*━━━━━━━━ USERS ━━━━━━━*/
CREATE TABLE users (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username   VARCHAR(255) NOT NULL UNIQUE,
  email      VARCHAR(255) UNIQUE, -- Cho phép NULL
  password   TEXT, -- TEXT để chứa password dài (bcrypt hash)
  phone      VARCHAR(255) UNIQUE,
  google_id  VARCHAR(255) UNIQUE,
  facebook_id VARCHAR(255) UNIQUE,
  avatar_url TEXT, -- TEXT cho URL dài của avatar
  full_name  VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  elo        INTEGER  DEFAULT 0,
  total_matches INTEGER DEFAULT 0,
  wins       INTEGER  DEFAULT 0,
  losses     INTEGER  DEFAULT 0,
  win_rate   DECIMAL(5,2) DEFAULT 0.0,
  star       INTEGER  DEFAULT 0,
  coin       INTEGER  DEFAULT 0,
  "isAdmin"  BOOLEAN  DEFAULT FALSE,
  is_banned  BOOLEAN  DEFAULT FALSE,
  last_login TIMESTAMP,
  selected_piece_skin UUID,
  selected_board_skin UUID,
  selected_background_skin UUID,
  selected_effect_skin UUID
);

/*━━━━━━━━ AUTHORIZATION ━*/
CREATE TABLE "authorization" (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  access_token  TEXT, -- TEXT vì JWT tokens rất dài
  refresh_token TEXT, -- TEXT vì JWT tokens rất dài
  created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

/*━━━━━━━━ MATCHES ━━━━━*/
-- Create ENUM type for match status
CREATE TYPE match_status AS ENUM ('waiting', 'ongoing', 'win', 'draw', 'lose');

CREATE TABLE matches (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  white_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  black_id   UUID REFERENCES users(id) ON DELETE SET NULL,
  status     match_status NOT NULL DEFAULT 'waiting',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  match_type INTEGER DEFAULT 0,               -- 0: casual, 1: rank
  white_elo_before INTEGER,
  black_elo_before INTEGER,
  white_elo_after INTEGER,
  black_elo_after INTEGER,
  started_at TIMESTAMP,
  completed_at TIMESTAMP
);

/*━━━━━━━━ MATCH HISTORIES ━*/
CREATE TABLE match_histories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id   UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  content    JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

/*━━━━━━━━ FRIEND REQUESTS ━*/
-- Create ENUM type for friend request status
CREATE TYPE friend_request_status AS ENUM ('pending', 'accepted', 'rejected');

CREATE TABLE friend_requests (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status      friend_request_status NOT NULL DEFAULT 'pending',
  created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Ngăn duplicate "pending"
CREATE UNIQUE INDEX uq_friend_pending
ON friend_requests(sender_id, receiver_id)
WHERE status = 'pending';

/*━━━━━━━━ ROOMS ━━━━━━━━*/
CREATE TABLE rooms (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  match_id   UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

/*━━━━━━━━ ITEMS ━━━━━━━━*/
CREATE TABLE items (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       VARCHAR(255) NOT NULL,
  price      INTEGER NOT NULL,
  number     INTEGER NOT NULL,
  image      TEXT, -- TEXT cho URL dài của image
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

/*━━━━━━━━ VOUCHERS ━━━━━━━━*/
CREATE TABLE "Vouchers" (
  id             SERIAL PRIMARY KEY,
  name           VARCHAR(255) NOT NULL UNIQUE,
  amount         INTEGER NOT NULL,
  "validDate"    TIMESTAMP WITH TIME ZONE NOT NULL,
  "expireDate"   TIMESTAMP WITH TIME ZONE NOT NULL,
  "redeemedUsers" TEXT[] DEFAULT '{}',
  "createdAt"    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt"    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

/*━━━━━━━━ VOUCHER REDEMPTIONS ━━━━━━━━*/
CREATE TABLE voucher_redemptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  voucher_id  INTEGER NOT NULL REFERENCES "Vouchers"(id) ON DELETE CASCADE,
  stars_added INTEGER NOT NULL,
  redeemed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Prevent same user from redeeming same voucher twice
  UNIQUE(user_id, voucher_id)
);

/*━━━━━━━━ ITEM PURCHASES ━━━━━━━━*/
CREATE TABLE item_purchases (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_id     UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  quantity    INTEGER NOT NULL DEFAULT 1,
  stars_spent INTEGER NOT NULL,
  coins_earned INTEGER NOT NULL,
  purchased_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

/*━━━━━━━━ PAYMENTS ━━━━━━━━*/
CREATE TABLE payments (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id             VARCHAR(255) NOT NULL UNIQUE,
  request_id           VARCHAR(255) NOT NULL UNIQUE,
  amount               BIGINT NOT NULL,
  stars_to_add         INTEGER NOT NULL,
  payment_method       VARCHAR(50) DEFAULT 'momo',
  status               VARCHAR(20) CHECK (status IN ('pending','completed','failed','cancelled')) DEFAULT 'pending',
  momo_transaction_id  VARCHAR(255),
  momo_response        JSONB,
  created_at           TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  completed_at         TIMESTAMP WITH TIME ZONE
);

/*━━━━━━━━ INDEXES FOR PERFORMANCE ━━━━━━━━*/
-- Users indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_google_id ON users(google_id);
CREATE INDEX idx_users_facebook_id ON users(facebook_id);
CREATE INDEX idx_users_elo ON users(elo);

-- Authorization indexes
CREATE INDEX idx_authorization_user_id ON "authorization"(user_id);

-- Matches indexes
CREATE INDEX idx_matches_white_id ON matches(white_id);
CREATE INDEX idx_matches_black_id ON matches(black_id);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_matches_match_type ON matches(match_type);
CREATE INDEX idx_matches_created_at ON matches(created_at);

-- Match histories indexes
CREATE INDEX idx_match_histories_match_id ON match_histories(match_id);

-- Friend requests indexes
CREATE INDEX idx_friend_requests_sender_id ON friend_requests(sender_id);
CREATE INDEX idx_friend_requests_receiver_id ON friend_requests(receiver_id);
CREATE INDEX idx_friend_requests_status ON friend_requests(status);

-- Rooms indexes
CREATE INDEX idx_rooms_owner_id ON rooms(owner_id);
CREATE INDEX idx_rooms_match_id ON rooms(match_id);

-- Payments indexes
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_payments_status ON payments(status);

-- Voucher redemptions indexes
CREATE INDEX idx_voucher_redemptions_user_id ON voucher_redemptions(user_id);
CREATE INDEX idx_voucher_redemptions_voucher_id ON voucher_redemptions(voucher_id);

-- Item purchases indexes
CREATE INDEX idx_item_purchases_user_id ON item_purchases(user_id);
CREATE INDEX idx_item_purchases_item_id ON item_purchases(item_id);

/*━━━━━━━━ FUNCTION & TRIGGER: update win/lose count ━*/
CREATE OR REPLACE FUNCTION update_user_win_lose_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.match_type = 1 AND NEW.status IN ('win','lose') THEN
    IF NEW.status = 'win' THEN
      UPDATE users SET wins = wins + 1, total_matches = total_matches + 1 WHERE id = NEW.white_id;
      UPDATE users SET losses = losses + 1, total_matches = total_matches + 1 WHERE id = NEW.black_id AND NEW.black_id IS NOT NULL;
    ELSE
      UPDATE users SET wins = wins + 1, total_matches = total_matches + 1 WHERE id = NEW.black_id AND NEW.black_id IS NOT NULL;
      UPDATE users SET losses = losses + 1, total_matches = total_matches + 1 WHERE id = NEW.white_id;
    END IF;
    
    -- Update win rates
    UPDATE users SET win_rate = CASE 
      WHEN total_matches > 0 THEN ROUND((wins * 100.0 / total_matches), 2)
      ELSE 0.0 
    END 
    WHERE id IN (NEW.white_id, NEW.black_id) AND NEW.black_id IS NOT NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER match_status_trigger
AFTER UPDATE OF status ON matches
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('win','lose'))
EXECUTE FUNCTION update_user_win_lose_count();

/*━━━━━━━━ FUNCTION & TRIGGER: auto update updated_at ━*/
CREATE OR REPLACE FUNCTION trg_friend_req_upd_time()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
BEFORE UPDATE ON friend_requests
FOR EACH ROW EXECUTE FUNCTION trg_friend_req_upd_time();

/*━━━━━━━━ FUNCTION: auto update user updated_at ━*/
CREATE OR REPLACE FUNCTION trg_user_upd_time()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_updated_at_trigger
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION trg_user_upd_time();

/*━━━━━━━━ SAMPLE DATA ━━━━━━━━*/

-- Insert sample admin user with proper bcrypt hash
INSERT INTO users (id, username, email, password, "isAdmin", star, coin, full_name) VALUES 
('11111111-1111-1111-1111-111111111111', 'admin', 'admin@game.com', crypt('admin123', gen_salt('bf')), TRUE, 1000, 100, 'Administrator');

-- Insert sample regular user
INSERT INTO users (id, username, email, password, "isAdmin", star, coin, full_name) VALUES 
('22222222-2222-2222-2222-222222222222', 'testuser', 'test@game.com', '$2b$10$N9qo8uLOickgx2ZMRZoMye1MhR4JcO6sZt4H3Z5hWpwh0dntI5dbu', FALSE, 500, 50, 'Test User');

-- Success message
SELECT 'Database schema created successfully with all tables, indexes, triggers, and sample data!' AS status;
