import { supabaseAdmin } from "../../config/supabase.js";

export interface NotificationRow {
  id: number;
  user_id: number;
  title: string;
  message: string;
  type: string;
  reference_id: number;
  is_read: number;
  created_at: string;
}

export async function getNotificationsByUser(userId: number): Promise<NotificationRow[]> {
  const { data, error } = await supabaseAdmin
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw error;
  return (data ?? []) as NotificationRow[];
}

export async function getUnreadCount(userId: number): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", 0);

  if (error) throw error;
  return count ?? 0;
}

export async function markNotificationRead(id: number): Promise<void> {
  const { error } = await supabaseAdmin
    .from("notifications")
    .update({ is_read: 1 })
    .eq("id", id);

  if (error) throw error;
}

export async function markAllNotificationsRead(userId: number): Promise<void> {
  const { error } = await supabaseAdmin
    .from("notifications")
    .update({ is_read: 1 })
    .eq("user_id", userId);

  if (error) throw error;
}

export async function createNotification(
  userId: number,
  title: string,
  message: string,
  type: string,
  referenceId?: number
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("notifications")
    .insert({
      user_id: userId,
      title,
      message,
      type,
      reference_id: referenceId ?? null,
    });

  if (error) throw error;
}
