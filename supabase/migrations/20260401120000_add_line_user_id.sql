-- Add line_user_id to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS line_user_id TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_line_user_id ON users(line_user_id);
