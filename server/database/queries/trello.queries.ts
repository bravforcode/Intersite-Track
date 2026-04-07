import { db } from "../../config/firebase-admin.js";
import type {
  TrelloConfig,
  TrelloCardMapping,
  TrelloStatusMapping,
  TrelloUserMapping,
  TrelloSyncLog,
} from "../../types/trello.js";

function nowIso(): string {
  return new Date().toISOString();
}

function mapConfig(id: string, data: Partial<TrelloConfig> = {}): TrelloConfig {
  const timestamp = data.updated_at ?? data.created_at ?? nowIso();
  return {
    id,
    api_key_encrypted: data.api_key_encrypted ?? "",
    token_encrypted: data.token_encrypted ?? "",
    board_id: data.board_id ?? "",
    board_url: data.board_url,
    enable_auto_sync: data.enable_auto_sync ?? true,
    enable_two_way_sync: data.enable_two_way_sync ?? false,
    webhook_id: data.webhook_id,
    webhook_url: data.webhook_url,
    created_at: data.created_at ?? timestamp,
    updated_at: data.updated_at ?? timestamp,
  };
}

function mapCardMapping(id: string, taskId: string, data: Partial<TrelloCardMapping> = {}): TrelloCardMapping {
  const timestamp = data.updated_at ?? data.created_at ?? nowIso();
  return {
    id,
    task_id: data.task_id ?? taskId,
    trello_card_id: data.trello_card_id ?? "",
    trello_card_url: data.trello_card_url,
    created_at: data.created_at ?? timestamp,
    updated_at: data.updated_at ?? timestamp,
  };
}

function mapStatusMapping(id: string, status: TrelloStatusMapping["status"], data: Partial<TrelloStatusMapping> = {}): TrelloStatusMapping {
  return {
    id,
    status: data.status ?? status,
    trello_list_id: data.trello_list_id ?? "",
    trello_list_name: data.trello_list_name,
    created_at: data.created_at ?? nowIso(),
  };
}

function mapUserMapping(id: string, userId: string, data: Partial<TrelloUserMapping> = {}): TrelloUserMapping {
  return {
    id,
    user_id: data.user_id ?? userId,
    trello_member_id: data.trello_member_id ?? "",
    trello_username: data.trello_username,
    created_at: data.created_at ?? nowIso(),
  };
}

function mapSyncLog(id: string, data: Partial<TrelloSyncLog> = {}): TrelloSyncLog {
  return {
    id,
    task_id: data.task_id,
    trello_card_id: data.trello_card_id,
    action: data.action ?? "update",
    status: data.status ?? "pending",
    error_message: data.error_message,
    retry_count: data.retry_count ?? 0,
    request_payload: data.request_payload,
    response_payload: data.response_payload,
    created_at: data.created_at ?? nowIso(),
    completed_at: data.completed_at,
  };
}

// ─── Config ───────────────────────────────────────────────────────────────────

export async function getConfig(): Promise<TrelloConfig | null> {
  const doc = await db.collection("trello_config").doc("config").get();
  if (!doc.exists) return null;
  return mapConfig(doc.id, doc.data() as Partial<TrelloConfig>);
}

export async function saveConfig(
  config: Omit<TrelloConfig, "id" | "created_at" | "updated_at">
): Promise<TrelloConfig> {
  const ref = db.collection("trello_config").doc("config");
  const existing = await ref.get();
  const existingData = existing.data() as Partial<TrelloConfig> | undefined;
  const payload = {
    api_key_encrypted: config.api_key_encrypted,
    token_encrypted: config.token_encrypted,
    board_id: config.board_id,
    board_url: config.board_url ?? null,
    enable_auto_sync: config.enable_auto_sync,
    enable_two_way_sync: config.enable_two_way_sync,
    webhook_id: config.webhook_id ?? null,
    webhook_url: config.webhook_url ?? null,
    created_at: existingData?.created_at ?? nowIso(),
    updated_at: nowIso(),
  };
  await ref.set(payload, { merge: true });
  return mapConfig(ref.id, payload);
}

// ─── Card Mappings ────────────────────────────────────────────────────────────

export async function getCardMapping(taskId: string): Promise<TrelloCardMapping | null> {
  const doc = await db.collection("trello_card_mappings").doc(taskId).get();
  if (!doc.exists) return null;
  return mapCardMapping(doc.id, taskId, doc.data() as Partial<TrelloCardMapping>);
}

export async function saveCardMapping(
  taskId: string,
  trelloCardId: string,
  trelloCardUrl?: string
): Promise<TrelloCardMapping> {
  const ref = db.collection("trello_card_mappings").doc(taskId);
  const existing = await ref.get();
  const existingData = existing.data() as Partial<TrelloCardMapping> | undefined;
  const payload = {
    task_id: taskId,
    trello_card_id: trelloCardId,
    trello_card_url: trelloCardUrl ?? null,
    created_at: existingData?.created_at ?? nowIso(),
    updated_at: nowIso(),
  };
  await ref.set(payload, { merge: true });
  return mapCardMapping(ref.id, taskId, payload);
}

export async function deleteCardMapping(taskId: string): Promise<void> {
  await db.collection("trello_card_mappings").doc(taskId).delete();
}

// ─── Status Mappings ──────────────────────────────────────────────────────────

export async function getStatusMappings(): Promise<TrelloStatusMapping[]> {
  const snap = await db.collection("trello_status_mappings").orderBy("status", "asc").get();
  return snap.docs.map((doc) => mapStatusMapping(doc.id, doc.id as TrelloStatusMapping["status"], doc.data() as Partial<TrelloStatusMapping>));
}

export async function saveStatusMapping(
  status: TrelloStatusMapping["status"],
  trelloListId: string,
  trelloListName?: string
): Promise<TrelloStatusMapping> {
  const ref = db.collection("trello_status_mappings").doc(status);
  const existing = await ref.get();
  const existingData = existing.data() as Partial<TrelloStatusMapping> | undefined;
  const payload = {
    status,
    trello_list_id: trelloListId,
    trello_list_name: trelloListName ?? null,
    created_at: existingData?.created_at ?? nowIso(),
  };
  await ref.set(payload, { merge: true });
  return mapStatusMapping(ref.id, status, payload);
}

// ─── User Mappings ────────────────────────────────────────────────────────────

export async function getUserMappings(): Promise<TrelloUserMapping[]> {
  const snap = await db.collection("trello_user_mappings").get();
  return snap.docs.map((doc) => mapUserMapping(doc.id, doc.id, doc.data() as Partial<TrelloUserMapping>));
}

export async function saveUserMapping(
  userId: string,
  trelloMemberId: string,
  trelloUsername?: string
): Promise<TrelloUserMapping> {
  const ref = db.collection("trello_user_mappings").doc(userId);
  const existing = await ref.get();
  const existingData = existing.data() as Partial<TrelloUserMapping> | undefined;
  const payload = {
    user_id: userId,
    trello_member_id: trelloMemberId,
    trello_username: trelloUsername ?? null,
    created_at: existingData?.created_at ?? nowIso(),
  };
  await ref.set(payload, { merge: true });
  return mapUserMapping(ref.id, userId, payload);
}

// ─── Sync Logs ────────────────────────────────────────────────────────────────

export async function createSyncLog(
  data: Pick<TrelloSyncLog, "task_id" | "trello_card_id" | "action" | "request_payload">
): Promise<TrelloSyncLog> {
  const ref = db.collection("trello_sync_logs").doc();
  const log: Partial<TrelloSyncLog> = {
    task_id: data.task_id ?? null,
    trello_card_id: data.trello_card_id ?? null,
    action: data.action,
    status: "pending",
    retry_count: 0,
    request_payload: data.request_payload ?? null,
    created_at: nowIso(),
  };
  await ref.set(log);
  return mapSyncLog(ref.id, log);
}

export async function updateSyncLog(
  id: string,
  data: Pick<TrelloSyncLog, "status" | "error_message" | "retry_count" | "response_payload">
): Promise<TrelloSyncLog> {
  const payload: Record<string, unknown> = {
    status: data.status,
    error_message: data.error_message ?? null,
    retry_count: data.retry_count,
    response_payload: data.response_payload ?? null,
  };
  if (data.status === "success" || data.status === "failed") {
    payload.completed_at = new Date().toISOString();
  }
  await db.collection("trello_sync_logs").doc(id).update(payload);
  const updated = await db.collection("trello_sync_logs").doc(id).get();
  return mapSyncLog(id, updated.data() as Partial<TrelloSyncLog>);
}

export interface SyncLogFilters {
  taskId?: string;
  status?: TrelloSyncLog["status"];
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

export async function getSyncLogs(filters: SyncLogFilters = {}): Promise<PaginatedSyncLogs> {
  const { page = 1, pageSize = 20 } = filters;

  let query: FirebaseFirestore.Query = db
    .collection("trello_sync_logs")
    .orderBy("created_at", "desc");

  if (filters.status) query = query.where("status", "==", filters.status);
  if (filters.taskId) query = query.where("task_id", "==", filters.taskId);
  if (filters.dateFrom) query = query.where("created_at", ">=", filters.dateFrom);
  if (filters.dateTo) query = query.where("created_at", "<=", filters.dateTo);

  const allSnap = await query.get();
  const total = allSnap.size;
  const start = (page - 1) * pageSize;
  const logs = allSnap.docs
    .slice(start, start + pageSize)
    .map((doc) => mapSyncLog(doc.id, doc.data() as Partial<TrelloSyncLog>));

  return { logs, total, page, pageSize };
}

export async function deleteOldLogs(olderThanDays: number): Promise<number> {
  const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000).toISOString();
  const snap = await db.collection("trello_sync_logs").where("created_at", "<", cutoff).get();
  const batch = db.batch();
  for (const doc of snap.docs) batch.delete(doc.ref);
  await batch.commit();
  return snap.size;
}
