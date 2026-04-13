import api from "./api";
import type {
  TimeEntry,
  TimeEntrySummary,
  StartTimerDTO,
  ManualTimeEntryDTO,
} from "../types/timeEntry";

export const timeEntryService = {
  /** Get all time entries for a task + total minutes */
  getTaskEntries: (taskId: string) =>
    api.get<TimeEntrySummary>(`/api/time-entries/${taskId}`),

  /** Start a live timer for a task */
  startTimer: (taskId: string, dto?: StartTimerDTO) =>
    api.post<TimeEntry>(`/api/time-entries/${taskId}/start`, dto ?? {}),

  /** Stop a running timer by entry ID */
  stopTimer: (entryId: string) =>
    api.patch<TimeEntry>(`/api/time-entries/${entryId}/stop`, {}),

  /** Log manual hours for a task */
  logManual: (taskId: string, dto: ManualTimeEntryDTO) =>
    api.post<TimeEntry>(`/api/time-entries/${taskId}/manual`, dto),

  /** Delete an entry */
  deleteEntry: (entryId: string) =>
    api.delete<{ success: boolean }>(`/api/time-entries/${entryId}`),

  /** Check if current user has any running timer */
  getRunning: () =>
    api.get<{ running_entry: TimeEntry | null }>("/api/time-entries/running"),
};

export default timeEntryService;
