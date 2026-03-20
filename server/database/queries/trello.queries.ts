import { supabaseAdmin } from "../../config/supabase.js";
import type {
  TrelloConfig,
  TrelloCardMapping,
  TrelloStatusMapping,
  TrelloUserMapping,
  TrelloSyncLog,
} from "../../types/trello.js";

// ─── Config ───────────────────────────────────────────────────────────────────

export async function getConfig(): Promise<TrelloConfig | null> {
  const { data, error } = await supabaseAdmin
    .from("trello_config")
    .select("*")
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data ?? null;
}

export async function saveConfig(
  config: Omit<TrelloConfig, "id" | "created_at" | "updated_at">
): Promise<TrelloConfig> {
  const payload = {
    id: 1,
    api_key_encrypted: config.api_key_encrypted,
    token_encrypted: config.token_encrypted,
    board_id: config.board_id,
    board_url: config.board_url ?? null,
    enable_auto_sync: config.enable_auto_sync,
    enable_two_way_sync: config.enable_two_way_sync,
    webhook_id: config.webhook_id ?? null,
    webhook_url: config.webhook_url ?? null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabaseAdmin
    .from("trello_config")
    .upsert(payload)
    .select("*")
    .single();

  if (error || !data) throw error ?? new Error("Failed to save Trello config");
  return data;
}

// ─── Card Mappings ────────────────────────────────────────────────────────────

export async function getCardMapping(
  taskId: number
): Promise<TrelloCardMapping | null> {
  const { data, error } = await supabaseAdmin
    .from("trello_card_mappings")
    .select("*")
    .eq("task_id", taskId)
    .maybeSingle();

  if (error) throw error;
  return data ?? null;
}

export async function saveCardMapping(
  taskId: number,
  trelloCardId: string,
  trelloCardUrl?: string
): Promise<TrelloCardMapping> {
  const { data, error } = await supabaseAdmin
    .from("trello_card_mappings")
    .upsert({
      task_id: taskId,
      trello_card_id: trelloCardId,
      trello_card_url: trelloCardUrl ?? null,
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error || !data) throw error ?? new Error("Failed to save Trello card mapping");
  return data;
}

export async function deleteCardMapping(taskId: number): Promise<void> {
  const { error } = await supabaseAdmin
    .from("trello_card_mappings")
    .delete()
    .eq("task_id", taskId);

  if (error) throw error;
}

// ─── Status Mappings ──────────────────────────────────────────────────────────

export async function getStatusMappings(): Promise<TrelloStatusMapping[]> {
  const { data, error } = await supabaseAdmin
    .from("trello_status_mappings")
    .select("*")
    .order("status", { ascending: true });

  if (error) throw error;
  return (data ?? []) as TrelloStatusMapping[];
}

export async function saveStatusMapping(
  status: TrelloStatusMapping["status"],
  trelloListId: string,
  trelloListName?: string
): Promise<TrelloStatusMapping> {
  const { data, error } = await supabaseAdmin
    .from("trello_status_mappings")
    .upsert({
      status,
      trello_list_id: trelloListId,
      trello_list_name: trelloListName ?? null,
    })
    .select("*")
    .single();

  if (error || !data) throw error ?? new Error("Failed to save Trello status mapping");
  return data;
}

// ─── User Mappings ────────────────────────────────────────────────────────────

export async function getUserMappings(): Promise<TrelloUserMapping[]> {
  const { data, error } = await supabaseAdmin
    .from("trello_user_mappings")
    .select("*")
    .order("user_id", { ascending: true });

  if (error) throw error;
  return (data ?? []) as TrelloUserMapping[];
}

export async function saveUserMapping(
  userId: number,
  trelloMemberId: string,
  trelloUsername?: string
): Promise<TrelloUserMapping> {
  const { data, error } = await supabaseAdmin
    .from("trello_user_mappings")
    .upsert({
      user_id: userId,
      trello_member_id: trelloMemberId,
      trello_username: trelloUsername ?? null,
    })
    .select("*")
    .single();

  if (error || !data) throw error ?? new Error("Failed to save Trello user mapping");
  return data;
}

// ─── Sync Logs ────────────────────────────────────────────────────────────────

export async function createSyncLog(
  data: Pick<TrelloSyncLog, "task_id" | "trello_card_id" | "action" | "request_payload">
): Promise<TrelloSyncLog> {
  const { data: created, error } = await supabaseAdmin
    .from("trello_sync_logs")
    .insert({
      task_id: data.task_id ?? null,
      trello_card_id: data.trello_card_id ?? null,
      action: data.action,
      status: "pending",
      retry_count: 0,
      request_payload: data.request_payload ?? null,
    })
    .select("*")
    .single();

  if (error || !created) throw error ?? new Error("Failed to create Trello sync log");
  return created;
}

export async function updateSyncLog(
  id: number,
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

  const { data: updated, error } = await supabaseAdmin
    .from("trello_sync_logs")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error || !updated) throw error ?? new Error("Failed to update Trello sync log");
  return updated;
}

export interface SyncLogFilters {
  taskId?: number;
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

export async function getSyncLogs(
  filters: SyncLogFilters = {}
): Promise<PaginatedSyncLogs> {
  const { page = 1, pageSize = 20 } = filters;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let countQuery = supabaseAdmin
    .from("trello_sync_logs")
    .select("*", { count: "exact", head: true });

  let logsQuery = supabaseAdmin
    .from("trello_sync_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .range(from, to);

  if (filters.taskId !== undefined) {
    countQuery = countQuery.eq("task_id", filters.taskId);
    logsQuery = logsQuery.eq("task_id", filters.taskId);
  }

  if (filters.status) {
    countQuery = countQuery.eq("status", filters.status);
    logsQuery = logsQuery.eq("status", filters.status);
  }

  if (filters.dateFrom) {
    countQuery = countQuery.gte("created_at", filters.dateFrom);
    logsQuery = logsQuery.gte("created_at", filters.dateFrom);
  }

  if (filters.dateTo) {
    countQuery = countQuery.lte("created_at", filters.dateTo);
    logsQuery = logsQuery.lte("created_at", filters.dateTo);
  }

  const [{ count, error: countError }, { data, error: logsError }] = await Promise.all([
    countQuery,
    logsQuery,
  ]);

  if (countError) throw countError;
  if (logsError) throw logsError;

  return {
    logs: (data ?? []) as TrelloSyncLog[],
    total: count ?? 0,
    page,
    pageSize,
  };
}

export async function deleteOldLogs(olderThanDays: number): Promise<number> {
  const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabaseAdmin
    .from("trello_sync_logs")
    .delete()
    .lt("created_at", cutoff)
    .select("id");

  if (error) throw error;
  return data?.length ?? 0;
}
