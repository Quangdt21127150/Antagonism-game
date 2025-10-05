-- One-off script to set admin password to 'admin123'
-- Safe to run multiple times (idempotent)

-- Ensure pgcrypto is available (needed for crypt / gen_salt)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Update by known admin id
UPDATE users 
SET password = crypt('admin123', gen_salt('bf'))
WHERE id = '11111111-1111-1111-1111-111111111111';

-- Fallback: update any user with username 'admin' and isAdmin = true
UPDATE users 
SET password = crypt('admin123', gen_salt('bf'))
WHERE username = 'admin' AND "isAdmin" = TRUE;

-- Show status
SELECT id, username, email, "isAdmin" FROM users WHERE username = 'admin' ORDER BY created_at DESC LIMIT 5;