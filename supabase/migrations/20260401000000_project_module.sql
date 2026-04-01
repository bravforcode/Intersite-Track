-- Project Management Module Schema
-- Adds projects, milestones, blockers, and weekly updates.

-- 1. Create Projects Table
CREATE TABLE IF NOT EXISTS public.projects (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    owner_id INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'planning',
    type TEXT DEFAULT 'new_dev',
    start_date DATE,
    deadline DATE,
    launch_date DATE,
    client_name TEXT,
    repo_url TEXT,
    domain_url TEXT,
    demo_url TEXT,
    design_url TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    CONSTRAINT projects_status_check CHECK (status = ANY (ARRAY['planning'::text, 'developing'::text, 'testing'::text, 'launched'::text, 'maintenance'::text, 'on_hold'::text, 'cancelled'::text])),
    CONSTRAINT projects_type_check CHECK (type = ANY (ARRAY['new_dev'::text, 'maintenance'::text, 'bug_fix'::text, 'support'::text]))
);

-- 2. Add project_id to Tasks Table
ALTER TABLE public.tasks 
    ADD COLUMN IF NOT EXISTS project_id INTEGER REFERENCES public.projects(id) ON DELETE SET NULL;

-- 3. Create Project Milestones Table
CREATE TABLE IF NOT EXISTS public.project_milestones (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    due_date DATE,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    CONSTRAINT project_milestones_status_check CHECK (status = ANY (ARRAY['pending'::text, 'completed'::text]))
);

-- 4. Create Blockers Table (Can be at project or task level)
CREATE TABLE IF NOT EXISTS public.blockers (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES public.projects(id) ON DELETE CASCADE,
    task_id INTEGER REFERENCES public.tasks(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    reported_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'active',
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    CONSTRAINT blockers_status_check CHECK (status = ANY (ARRAY['active'::text, 'resolved'::text])),
    CONSTRAINT blockers_target_check CHECK (project_id IS NOT NULL OR task_id IS NOT NULL)
);

-- 5. Create Project Weekly Updates Table
CREATE TABLE IF NOT EXISTS public.project_weekly_updates (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
    week_start_date DATE NOT NULL,
    completed_this_week TEXT,
    planned_next_week TEXT,
    current_blockers TEXT,
    risk_level TEXT DEFAULT 'low',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    CONSTRAINT project_weekly_updates_risk_level_check CHECK (risk_level = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text]))
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON public.projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_project_milestones_project_id ON public.project_milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_blockers_project_id ON public.blockers(project_id);
CREATE INDEX IF NOT EXISTS idx_blockers_task_id ON public.blockers(task_id);
CREATE INDEX IF NOT EXISTS idx_project_weekly_updates_project_id ON public.project_weekly_updates(project_id);

-- Enable RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blockers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_weekly_updates ENABLE ROW LEVEL SECURITY;

-- Policies (Simplified for now, similar to existing tables)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'projects' AND policyname = 'projects_authenticated_select') THEN
        CREATE POLICY projects_authenticated_select ON public.projects FOR SELECT TO authenticated USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'project_milestones' AND policyname = 'project_milestones_authenticated_select') THEN
        CREATE POLICY project_milestones_authenticated_select ON public.project_milestones FOR SELECT TO authenticated USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'blockers' AND policyname = 'blockers_authenticated_select') THEN
        CREATE POLICY blockers_authenticated_select ON public.blockers FOR SELECT TO authenticated USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'project_weekly_updates' AND policyname = 'project_weekly_updates_authenticated_select') THEN
        CREATE POLICY project_weekly_updates_authenticated_select ON public.project_weekly_updates FOR SELECT TO authenticated USING (true);
    END IF;
END $$;
