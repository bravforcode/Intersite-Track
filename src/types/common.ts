export interface StaffReport {
  id: number;
  first_name: string;
  last_name: string;
  position: string;
  department_name: string;
  total_tasks: number;
  completed: number;
  in_progress: number;
  pending: number;
}

export interface ApiError {
  error: string;
  detail?: string;
}
