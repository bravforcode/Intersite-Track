import { db, FieldValue } from "../../config/firebase-admin.js";

export interface NotificationRow {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  reference_id: string | null;
  is_read: number;
  created_at: string;
}

export async function getNotificationsByUser(userId: string): Promise<NotificationRow[]> {
  const snap = await db
    .collection("notifications")
    .where("user_id", "==", userId)
    .orderBy("created_at", "desc")
    .limit(50)
    .get();

  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as NotificationRow));
}

export async function getUnreadCount(userId: string): Promise<number> {
  const snap = await db
    .collection("notifications")
    .where("user_id", "==", userId)
    .where("is_read", "==", 0)
    .get();

  return snap.size;
}

export async function markNotificationRead(id: string): Promise<void> {
  await db.collection("notifications").doc(id).update({ is_read: 1 });
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const snap = await db
    .collection("notifications")
    .where("user_id", "==", userId)
    .where("is_read", "==", 0)
    .get();

  const batch = db.batch();
  for (const doc of snap.docs) {
    batch.update(doc.ref, { is_read: 1 });
  }
  await batch.commit();
}

export async function createNotification(
  userId: string,
  title: string,
  message: string,
  type: string,
  referenceId?: string
): Promise<void> {
  await db.collection("notifications").add({
    user_id: userId,
    title,
    message,
    type,
    reference_id: referenceId ?? null,
    is_read: 0,
    created_at: new Date().toISOString(),
  });
}
