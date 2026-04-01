-- Add tags to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_tasks_tags ON tasks USING GIN (tags);
