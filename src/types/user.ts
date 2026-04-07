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

export interface CreateUserDTO {
  email: string;
  username: string;
  password: string;
  first_name: string;
  last_name: string;
  role?: UserRole;
  department_id?: string | null;
  position?: string | null;
  line_user_id?: string | null;
}

export interface UpdateUserDTO {
  username: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  department_id?: string | null;
  position?: string | null;
  line_user_id?: string | null;
}

export interface Department {
  id: string;
  name: string;
}

export interface StaffReport {
  id: string;
  first_name: string;
  last_name: string;
  role: "admin" | "staff";
  position: string;
  department_name: string;
  total_tasks: number;
  completed: number;
  in_progress: number;
  pending: number;
  overdue: number;
  blocked: number;
  owned_projects: number;
}
