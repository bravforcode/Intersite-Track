import api from './api';
import type {
  TrelloConfigDisplay,
  TrelloConfigForm,
  TrelloConnectionTestResult,
  TrelloListOption,
  TrelloMemberOption,
  StatusMappingEntry,
  UserMappingEntry,
  SyncLogFilters,
  SyncLogPage,
} from '../types/trello';

const BASE = '/api/trello';

// ─── Config ───────────────────────────────────────────────────────────────────

export function getConfig(): Promise<TrelloConfigDisplay | null> {
  return api.get<TrelloConfigDisplay | null>(`${BASE}/config`);
}

export function saveConfig(form: TrelloConfigForm): Promise<TrelloConfigDisplay> {
  return api.post<TrelloConfigDisplay>(`${BASE}/config`, {
    apiKey: form.apiKey,
    token: form.token,
    boardId: form.boardId,
    boardUrl: form.boardUrl,
    enableAutoSync: form.enableAutoSync,
    enableTwoWaySync: form.enableTwoWaySync,
  });
}

export function testConnection(): Promise<TrelloConnectionTestResult> {
  return api.post<TrelloConnectionTestResult>(`${BASE}/test-connection`, {});
}

// ─── Board ────────────────────────────────────────────────────────────────────

export function getBoardLists(): Promise<TrelloListOption[]> {
  return api.get<TrelloListOption[]>(`${BASE}/board/lists`);
}

export function getBoardMembers(): Promise<TrelloMemberOption[]> {
  return api.get<TrelloMemberOption[]>(`${BASE}/board/members`);
}

// ─── Mappings ─────────────────────────────────────────────────────────────────

export function getStatusMappings(): Promise<StatusMappingEntry[]> {
  return api.get<StatusMappingEntry[]>(`${BASE}/status-mappings`);
}

export function saveStatusMappings(mappings: StatusMappingEntry[]): Promise<StatusMappingEntry[]> {
  return api.post<StatusMappingEntry[]>(`${BASE}/status-mappings`, { mappings });
}

export function getUserMappings(): Promise<UserMappingEntry[]> {
  return api.get<UserMappingEntry[]>(`${BASE}/user-mappings`);
}

export function saveUserMappings(mappings: UserMappingEntry[]): Promise<UserMappingEntry[]> {
  return api.post<UserMappingEntry[]>(`${BASE}/user-mappings`, { mappings });
}

// ─── Sync Logs ────────────────────────────────────────────────────────────────

export function getSyncLogs(filters: SyncLogFilters = {}): Promise<SyncLogPage> {
  const params = new URLSearchParams();
  if (filters.taskId !== undefined) params.set('taskId', String(filters.taskId));
  if (filters.status) params.set('status', filters.status);
  if (filters.action) params.set('action', filters.action);
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.set('dateTo', filters.dateTo);
  if (filters.page !== undefined) params.set('page', String(filters.page));
  if (filters.pageSize !== undefined) params.set('pageSize', String(filters.pageSize));
  return api.get<SyncLogPage>(`${BASE}/sync-logs?${params.toString()}`);
}

export function retrySyncForTask(taskId: string): Promise<{ success: boolean; message: string }> {
  return api.post<{ success: boolean; message: string }>(`${BASE}/retry/${taskId}`, {});
}

export function seedWeeklyProgress(payload: { startWeek: number; startDate: string; endDate?: string }) {
  return api.post<{ success: boolean; boardId: string; createdListsCount: number; createdCardsCount: number }>(
    `${BASE}/seed-weekly-progress`,
    payload
  );
}
