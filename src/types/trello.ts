// ─── Settings / Config ────────────────────────────────────────────────────────

/** Config as returned by the API (credentials are masked) */
export interface TrelloConfigDisplay {
  id: number;
  boardId: string;
  boardUrl?: string;
  enableAutoSync: boolean;
  enableTwoWaySync: boolean;
  webhookUrl?: string;
  isConnected: boolean;
  updatedAt: string;
}

/** Form values for saving Trello connection settings */
export interface TrelloConfigForm {
  apiKey: string;
  token: string;
  boardId: string;
  boardUrl?: string;
  enableAutoSync: boolean;
  enableTwoWaySync: boolean;
}

export interface TrelloConnectionTestResult {
  success: boolean;
  message: string;
}

// ─── Board Data ───────────────────────────────────────────────────────────────

export interface TrelloListOption {
  id: string;
  name: string;
  pos: number;
}

export interface TrelloMemberOption {
  id: string;
  username: string;
  fullName: string;
  avatarUrl?: string;
}

// ─── Mappings ─────────────────────────────────────────────────────────────────

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface StatusMappingEntry {
  status: TaskStatus;
  trelloListId: string;
  trelloListName?: string;
}

export interface UserMappingEntry {
  userId: number;
  username: string;
  fullName?: string;
  trelloMemberId: string;
  trelloUsername?: string;
}

// ─── Sync Status ──────────────────────────────────────────────────────────────

export type SyncStatus = 'pending' | 'success' | 'failed' | 'retrying';

export type SyncAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'sync_checklist'
  | 'sync_members'
  | 'sync_status';

/** Compact sync state shown on a task row */
export interface TaskSyncState {
  taskId: number;
  trelloCardId?: string;
  trelloCardUrl?: string;
  status: SyncStatus;
  lastAction?: SyncAction;
  lastSyncedAt?: string;
  errorMessage?: string;
}

// ─── Sync Logs ────────────────────────────────────────────────────────────────

/** A single log entry for the sync log viewer */
export interface SyncLogEntry {
  id: number;
  taskId?: number;
  taskTitle?: string;
  trelloCardId?: string;
  action: SyncAction;
  status: SyncStatus;
  errorMessage?: string;
  retryCount: number;
  createdAt: string;
  completedAt?: string;
}

/** Query params for fetching sync logs */
export interface SyncLogFilters {
  taskId?: number;
  status?: SyncStatus;
  action?: SyncAction;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export interface SyncLogPage {
  logs: SyncLogEntry[];
  total: number;
  page: number;
  pageSize: number;
}
