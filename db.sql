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

DROP FUNCTION IF EXISTS update_user_win_lose_count;
DROP FUNCTION IF EXISTS trg_friend_req_upd_time;
/*━━━━━━━━ USERS ━━━━━━━*/
CREATE TABLE users (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username   VARCHAR(255) NOT NULL UNIQUE,
  email      VARCHAR(255) NOT NULL UNIQUE,
  password   VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  elo        INTEGER  DEFAULT 0,
  win_count  INTEGER  DEFAULT 0,
  lose_count INTEGER  DEFAULT 0,
  star       INTEGER  DEFAULT 0,
  coin       INTEGER  DEFAULT 0,
  "isAdmin"  BOOLEAN  DEFAULT FALSE
);

/*━━━━━━━━ MATCHES ━━━━━*/
CREATE TABLE matches (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  white_id   UUID NOT NULL REFERENCES users(id),
  black_id   UUID REFERENCES users(id),
  status     VARCHAR(10) NOT NULL CHECK (status IN ('waiting','ongoing','win','draw','lose'))
             DEFAULT 'waiting',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  match_type INTEGER DEFAULT 0               -- 0: casual, 1: rank
);

/*━━━━━━━━ MATCH HISTORIES ━*/
CREATE TABLE match_histories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id   UUID NOT NULL REFERENCES matches(id),
  content    JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

/*━━━━━━━━ FRIEND REQUESTS ━*/
CREATE TABLE friend_requests (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status      VARCHAR(10) NOT NULL CHECK (status IN ('pending','accepted','rejected'))
              DEFAULT 'pending',
  created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Ngăn duplicate “pending”
CREATE UNIQUE INDEX uq_friend_pending
ON friend_requests(sender_id, receiver_id)
WHERE status = 'pending';

/*━━━━━━━━ AUTHORIZATION ━*/
CREATE TABLE "authorization" (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL UNIQUE REFERENCES users(id),
  access_token  VARCHAR(255),
  refresh_token VARCHAR(255),
  created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

/*━━━━━━━━ ROOMS ━━━━━━━━*/
CREATE TABLE rooms (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id   UUID NOT NULL REFERENCES users(id),
  match_id   UUID NOT NULL REFERENCES matches(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

/*━━━━━━━━ ITEMS ━━━━━━━━*/
CREATE TABLE items (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       VARCHAR(255) NOT NULL,
  price      INTEGER NOT NULL,
  number     INTEGER NOT NULL,
  image      VARCHAR(255),
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

CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_payments_status ON payments(status);

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

CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_payments_status ON payments(status);

/*━━━━━━━━ FUNCTION & TRIGGER: update win/lose count ━*/
CREATE OR REPLACE FUNCTION update_user_win_lose_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.match_type = 1 AND NEW.status IN ('win','lose') THEN
    IF NEW.status = 'win' THEN
      UPDATE users SET win_count  = win_count  + 1 WHERE id = NEW.white_id;
      UPDATE users SET lose_count = lose_count + 1 WHERE id = NEW.black_id AND NEW.black_id IS NOT NULL;
    ELSE
      UPDATE users SET win_count  = win_count  + 1 WHERE id = NEW.black_id AND NEW.black_id IS NOT NULL;
      UPDATE users SET lose_count = lose_count + 1 WHERE id = NEW.white_id;
    END IF;
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

/*━━━━━━━━ SAMPLE DATA ━━━━━━━━*/

-- Insert sample admin user
INSERT INTO users (id, username, email, password, "isAdmin", star, coin) VALUES 
('11111111-1111-1111-1111-111111111111', 'admin', 'admin@game.com', '$2b$10$placeholder_hash', TRUE, 1000, 100);


