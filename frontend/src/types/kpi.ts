// frontend/src/types/kpi.ts

export type KPIType = "okr" | "kpi";
export type KPIStatus = "on_track" | "at_risk" | "behind" | "completed";

export interface KPI {
  id: string;
  title: string;
  description: string;
  owner_id: string;
  owner_name: string;
  type: KPIType;
  objective?: string;
  target_value: number;
  current_value: number;
  unit: string;
  start_date: string;
  due_date: string;
  status: KPIStatus;
  progress: number; // 0-100
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateKPIInput {
  title: string;
  description?: string;
  owner_id: string;
  owner_name: string;
  type: KPIType;
  objective?: string;
  target_value: number;
  current_value?: number;
  unit?: string;
  start_date: string;
  due_date: string;
  status?: KPIStatus;
}

export interface UpdateKPIInput {
  title?: string;
  description?: string;
  owner_id?: string;
  owner_name?: string;
  type?: KPIType;
  objective?: string;
  target_value?: number;
  current_value?: number;
  unit?: string;
  start_date?: string;
  due_date?: string;
  status?: KPIStatus;
}

export interface KPIStats {
  total: number;
  on_track: number;
  at_risk: number;
  behind: number;
  completed: number;
  avg_progress: number;
}
