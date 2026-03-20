export type UserRole = "admin" | "staff";

export interface User {
  id: number;
  username: string;
  email?: string | null;
  first_name: string;
  last_name: string;
  role: UserRole;
  department_id: number;
  department_name?: string;
  position: string;
  created_at?: string;
  token?: string;
}

export interface CreateUserDTO {
  username: string;
  password: string;
  first_name: string;
  last_name: string;
  role?: UserRole;
  department_id?: number | null;
  position?: string | null;
}

export interface UpdateUserDTO {
  username: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  department_id?: number | null;
  position?: string | null;
}

export interface Department {
  id: number;
  name: string;
}
