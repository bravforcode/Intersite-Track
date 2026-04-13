// =============================================================================
// Intersite Track — Shared Type Definitions
// Used by both frontend and backend to ensure type consistency.
// =============================================================================

// ─── User & Auth ──────────────────────────────────────────────────────────────

export type UserRole = "admin" | "staff";

export interface User {
  id: string;
  username: string;
  email?: string | null;
  first_name: string;
  last_name: string;
  role: UserRole;
  department_id: string | null;
  department_name?: string;
  position: string;
  line_user_id?: string | null;
  created_at?: string;
  token?: string;
}

export interface Department {
  id: string;
  name: string;
}

// ─── Task ─────────────────────────────────────────────────────────────────────

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
  // SLA fields (Phase 2E)
  sla_enabled?: boolean;
  sla_target_days?: number;
  sla_anchor_date?: string;
  sla_deadline_date?: string | null;
  sla_status?: "fine" | "warning" | "breached";
  sla_status_updated_at?: string;
  sla_elapsed_business_days?: number;
  sla_alert_state?: "none" | "warning_sent" | "breach_sent";
  sla_last_alerted_at?: string;
  sla_breached_at?: string | null;
  met_sla?: boolean;
  estimated_hours?: number;
  actual_hours?: number;
}

export interface TaskType {
  id: string;
  name: string;
}

// ─── Project ──────────────────────────────────────────────────────────────────

export type ProjectStatus = "planning" | "active" | "on_hold" | "completed" | "cancelled";

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  owner_id: string;
  owner_name?: string;
  start_date?: string;
  end_date?: string;
  progress: number;
  created_at: string;
}

// ─── Notification ─────────────────────────────────────────────────────────────

export type NotificationType =
  | "task_assigned"
  | "task_deadline"
  | "task_completed"
  | "task_comment"
  | "approval_requested"
  | "approval_approved"
  | "approval_rejected"
  | "system";

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  reference_id?: string;
  is_read: boolean;
  created_at: string;
}

// ─── Approval Workflow (Phase 2A — NEW) ───────────────────────────────────────

export type ApprovalStatus = "pending" | "approved" | "rejected" | "returned";

export interface ApprovalStep {
  id: string;
  approver_id: string;
  approver_name?: string;
  order: number;
  status: ApprovalStatus;
  comment?: string;
  decided_at?: string;
}

export interface ApprovalWorkflow {
  id: string;
  task_id: string;
  created_by: string;
  status: ApprovalStatus;
  steps: ApprovalStep[];
  created_at: string;
  updated_at?: string;
}

// ─── Time Tracking (Phase 2B — NEW) ──────────────────────────────────────────

export interface TimeEntry {
  id: string;
  task_id: string;
  user_id: string;
  user_name?: string;
  description?: string;
  started_at: string;
  ended_at?: string;
  duration_minutes?: number;
  created_at: string;
}

// ─── KPI / OKR (Phase 2D — NEW) ──────────────────────────────────────────────

export interface KeyResult {
  id: string;
  title: string;
  target_value: number;
  current_value: number;
  unit: string;
  linked_task_ids?: string[];
}

export interface Objective {
  id: string;
  title: string;
  description?: string;
  owner_id: string;
  department_id?: string;
  quarter: string;    // e.g. "Q2-2025"
  progress: number;   // 0-100 auto-calculated
  key_results: KeyResult[];
  created_at: string;
}

// ─── Common ───────────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: unknown;
}