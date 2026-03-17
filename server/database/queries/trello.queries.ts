import { query, transaction } from '../connection.js';
import type {
  TrelloConfig,
  TrelloCardMapping,
  TrelloStatusMapping,
  TrelloUserMapping,
  TrelloSyncLog,
} from '../../types/trello.js';

// ─── Config ───────────────────────────────────────────────────────────────────

export async function getConfig(): Promise<TrelloConfig | null> {
  const result = await query<TrelloConfig>(
    'SELECT * FROM trello_config ORDER BY id LIMIT 1'
  );
  return result.rows[0] ?? null;
}

export async function saveConfig(
  config: Omit<TrelloConfig, 'id' | 'created_at' | 'updated_at'>
): Promise<TrelloConfig> {
  const result = await query<TrelloConfig>(
    `INSERT INTO trello_config
       (id, api_key_encrypted, token_encrypted, board_id, board_url,
        enable_auto_sync, enable_two_way_sync, webhook_id, webhook_url)
     VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (id) DO UPDATE SET
       api_key_encrypted   = EXCLUDED.api_key_encrypted,
       token_encrypted     = EXCLUDED.token_encrypted,
       board_id            = EXCLUDED.board_id,
       board_url           = EXCLUDED.board_url,
       enable_auto_sync    = EXCLUDED.enable_auto_sync,
       enable_two_way_sync = EXCLUDED.enable_two_way_sync,
       webhook_id          = EXCLUDED.webhook_id,
       webhook_url         = EXCLUDED.webhook_url,
       updated_at          = CURRENT_TIMESTAMP
     RETURNING *`,
    [
      config.api_key_encrypted,
      config.token_encrypted,
      config.board_id,
      config.board_url ?? null,
      config.enable_auto_sync,
      config.enable_two_way_sync,
      config.webhook_id ?? null,
      config.webhook_url ?? null,
    ]
  );
  return result.rows[0];
}

// ─── Card Mappings ────────────────────────────────────────────────────────────

export async function getCardMapping(
  taskId: number
): Promise<TrelloCardMapping | null> {
  const result = await query<TrelloCardMapping>(
    'SELECT * FROM trello_card_mappings WHERE task_id = $1',
    [taskId]
  );
  return result.rows[0] ?? null;
}

export async function saveCardMapping(
  taskId: number,
  trelloCardId: string,
  trelloCardUrl?: string
): Promise<TrelloCardMapping> {
  const result = await query<TrelloCardMapping>(
    `INSERT INTO trello_card_mappings (task_id, trello_card_id, trello_card_url)
     VALUES ($1, $2, $3)
     ON CONFLICT (task_id) DO UPDATE SET
       trello_card_id  = EXCLUDED.trello_card_id,
       trello_card_url = EXCLUDED.trello_card_url,
       updated_at      = CURRENT_TIMESTAMP
     RETURNING *`,
    [taskId, trelloCardId, trelloCardUrl ?? null]
  );
  return result.rows[0];
}

export async function deleteCardMapping(taskId: number): Promise<void> {
  await query('DELETE FROM trello_card_mappings WHERE task_id = $1', [taskId]);
}

// ─── Status Mappings ──────────────────────────────────────────────────────────

export async function getStatusMappings(): Promise<TrelloStatusMapping[]> {
  const result = await query<TrelloStatusMapping>(
    'SELECT * FROM trello_status_mappings ORDER BY status'
  );
  return result.rows;
}

export async function saveStatusMapping(
  status: TrelloStatusMapping['status'],
  trelloListId: string,
  trelloListName?: string
): Promise<TrelloStatusMapping> {
  const result = await query<TrelloStatusMapping>(
    `INSERT INTO trello_status_mappings (status, trello_list_id, trello_list_name)
     VALUES ($1, $2, $3)
     ON CONFLICT (status) DO UPDATE SET
       trello_list_id   = EXCLUDED.trello_list_id,
       trello_list_name = EXCLUDED.trello_list_name
     RETURNING *`,
    [status, trelloListId, trelloListName ?? null]
  );
  return result.rows[0];
}

// ─── User Mappings ────────────────────────────────────────────────────────────

export async function getUserMappings(): Promise<TrelloUserMapping[]> {
  const result = await query<TrelloUserMapping>(
    'SELECT * FROM trello_user_mappings ORDER BY user_id'
  );
  return result.rows;
}

export async function saveUserMapping(
  userId: number,
  trelloMemberId: string,
  trelloUsername?: string
): Promise<TrelloUserMapping> {
  const result = await query<TrelloUserMapping>(
    `INSERT INTO trello_user_mappings (user_id, trello_member_id, trello_username)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id) DO UPDATE SET
       trello_member_id = EXCLUDED.trello_member_id,
       trello_username  = EXCLUDED.trello_username
     RETURNING *`,
    [userId, trelloMemberId, trelloUsername ?? null]
  );
  return result.rows[0];
}

// ─── Sync Logs ────────────────────────────────────────────────────────────────

export async function createSyncLog(
  data: Pick<TrelloSyncLog, 'task_id' | 'trello_card_id' | 'action' | 'request_payload'>
): Promise<TrelloSyncLog> {
  const result = await query<TrelloSyncLog>(
    `INSERT INTO trello_sync_logs
       (task_id, trello_card_id, action, status, retry_count, request_payload)
     VALUES ($1, $2, $3, 'pending', 0, $4)
     RETURNING *`,
    [
      data.task_id ?? null,
      data.trello_card_id ?? null,
      data.action,
      data.request_payload ? JSON.stringify(data.request_payload) : null,
    ]
  );
  return result.rows[0];
}

export async function updateSyncLog(
  id: number,
  data: Pick<TrelloSyncLog, 'status' | 'error_message' | 'retry_count' | 'response_payload'>
): Promise<TrelloSyncLog> {
  const result = await query<TrelloSyncLog>(
    `UPDATE trello_sync_logs
     SET status           = $1,
         error_message    = $2,
         retry_count      = $3,
         response_payload = $4,
         completed_at     = CASE WHEN $1 IN ('success', 'failed') THEN CURRENT_TIMESTAMP ELSE completed_at END
     WHERE id = $5
     RETURNING *`,
    [
      data.status,
      data.error_message ?? null,
      data.retry_count,
      data.response_payload ? JSON.stringify(data.response_payload) : null,
      id,
    ]
  );
  return result.rows[0];
}

export interface SyncLogFilters {
  taskId?: number;
  status?: TrelloSyncLog['status'];
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export interface PaginatedSyncLogs {
  logs: TrelloSyncLog[];
  total: number;
  page: number;
  pageSize: number;
}

export async function getSyncLogs(
  filters: SyncLogFilters = {}
): Promise<PaginatedSyncLogs> {
  const { page = 1, pageSize = 20 } = filters;
  const offset = (page - 1) * pageSize;

  const conditions: string[] = [];
  const params: any[] = [];
  let paramIdx = 1;

  if (filters.taskId !== undefined) {
    conditions.push(`task_id = $${paramIdx++}`);
    params.push(filters.taskId);
  }

  if (filters.status) {
    conditions.push(`status = $${paramIdx++}`);
    params.push(filters.status);
  }

  if (filters.dateFrom) {
    conditions.push(`created_at >= $${paramIdx++}`);
    params.push(filters.dateFrom);
  }

  if (filters.dateTo) {
    conditions.push(`created_at <= $${paramIdx++}`);
    params.push(filters.dateTo);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM trello_sync_logs ${where}`,
    params
  );
  const total = parseInt(countResult.rows[0].count, 10);

  const logsResult = await query<TrelloSyncLog>(
    `SELECT * FROM trello_sync_logs ${where}
     ORDER BY created_at DESC
     LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
    [...params, pageSize, offset]
  );

  return {
    logs: logsResult.rows,
    total,
    page,
    pageSize,
  };
}

export async function deleteOldLogs(olderThanDays: number): Promise<number> {
  const result = await query<{ count: string }>(
    `DELETE FROM trello_sync_logs
     WHERE created_at < NOW() - INTERVAL '1 day' * $1
     RETURNING id`,
    [olderThanDays]
  );
  return result.rowCount ?? 0;
}
