// =============================================================================
// Time Entry types — backend-local copy
// Kept in sync with shared/types/index.ts (Phase 2B)
// =============================================================================

export interface TimeEntry {
  id: string;
  task_id: string;
  user_id: string;
  user_name?: string;
  description?: string;
  started_at: string;   // ISO timestamp
  ended_at?: string;    // ISO timestamp (undefined = still running)
  duration_minutes?: number; // calculated on stop, or set manually
  created_at: string;
}

export interface CreateTimeEntryDTO {
  task_id: string;
  user_id: string;
  user_name?: string;
  description?: string;
  /** Manual entry: provide both started_at + duration_minutes */
  started_at?: string;
  duration_minutes?: number;
}
