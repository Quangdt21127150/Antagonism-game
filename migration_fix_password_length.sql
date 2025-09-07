-- Migration: Fix password and token length issues
-- Date: 2025-09-07

-- Update users table to handle longer passwords and avatar URLs
ALTER TABLE users 
  ALTER COLUMN password TYPE TEXT,
  ALTER COLUMN avatar_url TYPE TEXT;

-- Update authorization table to handle longer JWT tokens
ALTER TABLE "authorization" 
  ALTER COLUMN access_token TYPE TEXT,
  ALTER COLUMN refresh_token TYPE TEXT;

-- Verify changes
\d users;
\d "authorization";

-- Success message
SELECT 'Migration completed: Fixed password and token length limits' AS status;
