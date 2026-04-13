// Time Entry types — frontend

export interface TimeEntry {
  id: string;
  task_id: string;
  user_id: string;
  user_name?: string;
  description?: string;
  started_at: string;          // ISO timestamp
  ended_at?: string;           // undefined = still running
  duration_minutes?: number;
  created_at: string;
}

export interface TimeEntrySummary {
  entries: TimeEntry[];
  total_minutes: number;
}

export interface StartTimerDTO {
  description?: string;
}

export interface ManualTimeEntryDTO {
  duration_minutes: number;
  description?: string;
  started_at?: string;
}
