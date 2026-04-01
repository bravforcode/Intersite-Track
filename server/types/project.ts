export interface Project {
    id: number;
    name: string;
    description?: string;
    owner_id?: number;
    status: 'planning' | 'developing' | 'testing' | 'launched' | 'maintenance' | 'on_hold' | 'cancelled';
    type: 'new_dev' | 'maintenance' | 'bug_fix' | 'support';
    start_date?: string;
    deadline?: string;
    launch_date?: string;
    client_name?: string;
    repo_url?: string;
    domain_url?: string;
    demo_url?: string;
    design_url?: string;
    notes?: string;
    created_at?: string;
    updated_at?: string;
}

export interface ProjectMilestone {
    id: number;
    project_id: number;
    title: string;
    description?: string;
    due_date?: string;
    status: 'pending' | 'completed';
    created_at?: string;
}

export interface Blocker {
    id: number;
    project_id?: number;
    task_id?: number;
    description: string;
    reported_by?: number;
    status: 'active' | 'resolved';
    resolved_at?: string;
    created_at?: string;
}

export interface ProjectWeeklyUpdate {
    id: number;
    project_id: number;
    user_id?: number;
    week_start_date: string;
    completed_this_week?: string;
    planned_next_week?: string;
    current_blockers?: string;
    risk_level: 'low' | 'medium' | 'high';
    created_at?: string;
}
