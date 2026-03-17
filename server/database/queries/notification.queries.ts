import { query } from "../connection";

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
  const result = await query<NotificationRow>(
    "SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50",
    [userId]
  );
  return result.rows;
}

export async function getUnreadCount(userId: number): Promise<number> {
  const result = await query<{ count: string }>(
    "SELECT count(*) as count FROM notifications WHERE user_id = $1 AND is_read = 0",
    [userId]
  );
  return Number(result.rows[0].count);
}

export async function markNotificationRead(id: number): Promise<void> {
  await query("UPDATE notifications SET is_read = 1 WHERE id = $1", [id]);
}

export async function markAllNotificationsRead(userId: number): Promise<void> {
  await query("UPDATE notifications SET is_read = 1 WHERE user_id = $1", [userId]);
}

export async function createNotification(
  userId: number,
  title: string,
  message: string,
  type: string,
  referenceId?: number
): Promise<void> {
  await query(
    "INSERT INTO notifications (user_id, title, message, type, reference_id) VALUES ($1, $2, $3, $4, $5)",
    [userId, title, message, type, referenceId ?? null]
  );
}
