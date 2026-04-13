// ─── Database Models ──────────────────────────────────────────────────────────

export interface TrelloConfig {
  id: string;
  api_key_encrypted: string;
  token_encrypted: string;
  board_id: string;
  board_url?: string;
  enable_auto_sync: boolean;
  enable_two_way_sync: boolean;
  webhook_id?: string;
  webhook_url?: string;
  created_at: string;
  updated_at: string;
}

export interface TrelloCardMapping {
  id: string;
  task_id: string;
  trello_card_id: string;
  trello_card_url?: string;
  created_at: string;
  updated_at: string;
}

export interface TrelloStatusMapping {
  id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  trello_list_id: string;
  trello_list_name?: string;
  created_at: string;
}

export interface TrelloUserMapping {
  id: string;
  user_id: string;
  trello_member_id: string;
  trello_username?: string;
  created_at: string;
}

export interface TrelloSyncLog {
  id: string;
  task_id?: string;
  trello_card_id?: string;
  action: 'create' | 'update' | 'delete' | 'sync_checklist' | 'sync_members' | 'sync_status';
  status: 'pending' | 'success' | 'failed' | 'retrying';
  error_message?: string;
  retry_count: number;
  request_payload?: Record<string, unknown>;
  response_payload?: Record<string, unknown>;
  created_at: string;
  completed_at?: string;
}

// ─── Trello API Objects ───────────────────────────────────────────────────────

export interface TrelloLabel {
  id: string;
  name: string;
  color: string;
}

export interface TrelloCheckItem {
  id: string;
  name: string;
  state: 'complete' | 'incomplete';
  pos: number;
}

export interface TrelloChecklist {
  id: string;
  name: string;
  idCard: string;
  checkItems: TrelloCheckItem[];
}

export interface TrelloCard {
  id: string;
  name: string;
  desc: string;
  due: string | null;
  idList: string;
  idBoard: string;
  idMembers: string[];
  labels: TrelloLabel[];
  url: string;
  closed: boolean;
}

export interface TrelloList {
  id: string;
  name: string;
  pos: number;
  closed: boolean;
  idBoard: string;
}

export interface TrelloMember {
  id: string;
  username: string;
  fullName: string;
  avatarUrl?: string;
}

export interface TrelloWebhook {
  id: string;
  description: string;
  idModel: string;
  callbackURL: string;
  active: boolean;
}

// ─── Sync Service Types ───────────────────────────────────────────────────────

export interface SyncJob {
  taskId: string;
  action: 'create' | 'update' | 'delete' | 'sync_checklist' | 'sync_members';
  retryCount: number;
  maxRetries: number;
}

export interface SyncResult {
  success: boolean;
  error?: string;
  trelloCardId?: string;
}

export interface TaskChanges {
  title?: string;
  description?: string;
  due_date?: string | null;
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority?: string;
  assigned_users?: string[];
  checklists?: unknown[];
}

// ─── API Client Input Types ───────────────────────────────────────────────────

export interface CreateCardData {
  name: string;
  desc?: string;
  due?: string | null;
  idList: string;
  idMembers?: string[];
  idLabels?: string[];
}

export interface UpdateCardData {
  name?: string;
  desc?: string;
  due?: string | null;
  idList?: string;
  closed?: boolean;
}

export interface CreateListData {
  name: string;
  idBoard: string;
  pos?: 'top' | 'bottom' | number;
}
