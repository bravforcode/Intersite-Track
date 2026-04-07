import type { User } from "./user";

export type TaskStatus = "pending" | "in_progress" | "completed" | "cancelled";
export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface TaskAssignment {
  id: string;
  first_name: string;
  last_name: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  task_type_id: string;
  task_type_name?: string;
  priority: TaskPriority;
  status: TaskStatus;
  due_date: string;
  progress: number;
  created_at: string;
  updated_at?: string;
  created_by?: string;
  creator_name: string;
  assignments: TaskAssignment[];
  project_id?: string;
  project_name?: string;
  is_blocked?: boolean;
  tags?: string[];
}

export interface TaskUpdate {
  id: string;
  task_id: string;
  user_id: string;
  update_text: string;
  progress: number;
  attachment_url?: string;
  created_at: string;
  first_name: string;
  last_name: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  message: string;
  created_at: string;
  user_name?: string;
}

export interface TaskActivity {
  id: string;
  task_id: string;
  user_id: string | null;
  action: string;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  created_at: string;
  user_name?: string;
  type: "audit";
}

export interface TaskChecklistRow {
  id: string;
  task_id: string;
  parent_id: string | null;
  title: string;
  is_checked: boolean;
  sort_order: number;
  checked_by?: string | null;
  checked_at?: string | null;
  checked_by_name?: string | null;
}

export interface ChecklistChild {
  id?: string;
  title: string;
  is_checked: boolean;
  sort_order: number;
  checked_by?: string | null;
  checked_at?: string | null;
  checked_by_name?: string | null;
}

export interface ChecklistItem {
  id?: string;
  title: string;
  is_checked: boolean;
  sort_order: number;
  checked_by?: string | null;
  checked_at?: string | null;
  checked_by_name?: string | null;
  children: ChecklistChild[];
}

export interface TaskType {
  id: string;
  name: string;
}

export interface TaskWorkspace {
  tasks: Task[];
  users: User[];
  taskTypes: TaskType[];
}

export interface CreateTaskDTO {
  title: string;
  description?: string;
  task_type_id?: string | null;
  priority?: TaskPriority;
  due_date?: string;
  created_by: string;
  assigned_user_ids?: string[];
}

export interface UpdateTaskDTO {
  title: string;
  description?: string;
  task_type_id?: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  due_date?: string;
  assigned_user_ids?: string[];
}

export interface Stats {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  cancelled: number;
}
