-- Add status and color to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#5A5A40';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
