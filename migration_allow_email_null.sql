-- Migration: Allow email to be NULL
-- Date: 2025-09-07

-- First, drop the NOT NULL constraint on email
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;

-- Verify the change
\d users;

-- Success message
SELECT 'Migration completed: Email field now allows NULL values' AS status;
