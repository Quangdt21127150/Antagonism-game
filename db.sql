-- Enable UUID generator
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Drop everything (idempotent)
DROP TABLE IF EXISTS match_histories  CASCADE;
DROP TABLE IF EXISTS friend_requests  CASCADE;
DROP TABLE IF EXISTS authorization    CASCADE;
DROP TABLE IF EXISTS rooms            CASCADE;
DROP TABLE IF EXISTS matches          CASCADE;
DROP TABLE IF EXISTS users            CASCADE;

DROP TRIGGER  IF EXISTS match_status_trigger  ON matches;
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
  star       INTEGER  DEFAULT 0
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
CREATE TABLE authorization (
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
