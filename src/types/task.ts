import type { User } from "./user";

export type TaskStatus = "pending" | "in_progress" | "completed" | "cancelled";
export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface TaskAssignment {
  id: number;
  first_name: string;
  last_name: string;
}

export interface Task {
  id: number;
  title: string;
  description: string;
  task_type_id: number;
  task_type_name?: string;
  priority: TaskPriority;
  status: TaskStatus;
  due_date: string;
  progress: number;
  created_at: string;
  updated_at?: string;
  created_by?: number;
  creator_name: string;
  assignments: TaskAssignment[];
}

export interface TaskUpdate {
  id: number;
  task_id: number;
  user_id: number;
  update_text: string;
  progress: number;
  attachment_url?: string;
  created_at: string;
  first_name: string;
  last_name: string;
}

export interface TaskComment {
  id: number;
  task_id: number;
  user_id: number;
  message: string;
  created_at: string;
  user_name?: string;
}

export interface TaskActivity {
  id: number;
  task_id: number;
  user_id: number | null;
  action: string;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  created_at: string;
  user_name?: string;
  type: "audit";
}

export interface TaskChecklistRow {
  id: number;
  task_id: number;
  parent_id: number | null;
  title: string;
  is_checked: boolean;
  sort_order: number;
  checked_by?: number | null;
  checked_at?: string | null;
  checked_by_name?: string | null;
}

export interface ChecklistChild {
  id?: number;
  title: string;
  is_checked: boolean;
  sort_order: number;
  checked_by?: number | null;
  checked_at?: string | null;
  checked_by_name?: string | null;
}

export interface ChecklistItem {
  id?: number;
  title: string;
  is_checked: boolean;
  sort_order: number;
  checked_by?: number | null;
  checked_at?: string | null;
  checked_by_name?: string | null;
  children: ChecklistChild[];
}

export interface TaskType {
  id: number;
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
  task_type_id?: number | null;
  priority?: TaskPriority;
  due_date?: string;
  created_by: number;
  assigned_user_ids?: number[];
}

export interface UpdateTaskDTO {
  title: string;
  description?: string;
  task_type_id?: number | null;
  priority: TaskPriority;
  status: TaskStatus;
  due_date?: string;
  assigned_user_ids?: number[];
}

export interface Stats {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  cancelled: number;
}
