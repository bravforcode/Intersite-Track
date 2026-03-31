ALTER TABLE public.task_checklists
    ADD COLUMN IF NOT EXISTS checked_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS checked_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_task_checklists_checked_by
    ON public.task_checklists(checked_by);
