import { User } from './user';
import { Task } from './task';

export type ProjectStatus = 'planning' | 'developing' | 'testing' | 'launched' | 'maintenance' | 'on_hold' | 'cancelled';
export type ProjectType = 'new_dev' | 'maintenance' | 'bug_fix' | 'support';
export type BlockerStatus = 'active' | 'resolved';
export type RiskLevel = 'low' | 'medium' | 'high';
export type MilestoneStatus = 'pending' | 'completed';

export interface Project {
  id: string;
  name: string;
  description?: string;
  owner_id?: string;
  owner?: User;
  status: ProjectStatus;
  type: ProjectType;
  color?: string;
  tags?: string[];
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
  tasks?: Task[];
  milestones?: ProjectMilestone[];
  blockers?: Blocker[];
  weekly_updates?: ProjectWeeklyUpdate[];
}

export interface ProjectMilestone {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  due_date?: string;
  status: MilestoneStatus;
  created_at?: string;
}

export interface Blocker {
  id: string;
  project_id?: string;
  task_id?: string;
  description: string;
  reported_by?: string;
  reporter?: User;
  status: BlockerStatus;
  resolved_at?: string;
  created_at?: string;
}

export interface ProjectWeeklyUpdate {
  id: string;
  project_id: string;
  user_id?: string;
  user?: User;
  week_start_date: string;
  completed_this_week?: string;
  planned_next_week?: string;
  current_blockers?: string;
  risk_level: RiskLevel;
  created_at?: string;
}
