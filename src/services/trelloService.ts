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

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'เกิดข้อผิดพลาด' }));
    throw new Error(err.error || 'เกิดข้อผิดพลาด');
  }
  return res.json();
}

// ─── Config ───────────────────────────────────────────────────────────────────

export function getConfig(): Promise<TrelloConfigDisplay | null> {
  return apiFetch(`${BASE}/config`);
}

export function saveConfig(form: TrelloConfigForm): Promise<TrelloConfigDisplay> {
  return apiFetch(`${BASE}/config`, {
    method: 'POST',
    body: JSON.stringify({
      apiKey: form.apiKey,
      token: form.token,
      boardId: form.boardId,
      boardUrl: form.boardUrl,
      enableAutoSync: form.enableAutoSync,
      enableTwoWaySync: form.enableTwoWaySync,
    }),
  });
}

export function testConnection(): Promise<TrelloConnectionTestResult> {
  return apiFetch(`${BASE}/test-connection`, { method: 'POST' });
}

// ─── Board ────────────────────────────────────────────────────────────────────

export function getBoardLists(): Promise<TrelloListOption[]> {
  return apiFetch(`${BASE}/board/lists`);
}

export function getBoardMembers(): Promise<TrelloMemberOption[]> {
  return apiFetch(`${BASE}/board/members`);
}

// ─── Mappings ─────────────────────────────────────────────────────────────────

export function getStatusMappings(): Promise<StatusMappingEntry[]> {
  return apiFetch(`${BASE}/status-mappings`);
}

export function saveStatusMappings(mappings: StatusMappingEntry[]): Promise<StatusMappingEntry[]> {
  return apiFetch(`${BASE}/status-mappings`, {
    method: 'POST',
    body: JSON.stringify({ mappings }),
  });
}

export function getUserMappings(): Promise<UserMappingEntry[]> {
  return apiFetch(`${BASE}/user-mappings`);
}

export function saveUserMappings(mappings: UserMappingEntry[]): Promise<UserMappingEntry[]> {
  return apiFetch(`${BASE}/user-mappings`, {
    method: 'POST',
    body: JSON.stringify({ mappings }),
  });
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
  return apiFetch(`${BASE}/sync-logs?${params.toString()}`);
}

export function retrySyncForTask(taskId: number): Promise<{ success: boolean; message: string }> {
  return apiFetch(`${BASE}/retry/${taskId}`, { method: 'POST' });
}
