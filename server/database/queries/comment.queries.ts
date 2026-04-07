import { db } from "../../config/firebase-admin.js";

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  message: string;
  created_at: string;
  user_name?: string;
}

export async function getCommentsByTaskId(taskId: string): Promise<TaskComment[]> {
  const snap = await db
    .collection("task_comments")
    .where("task_id", "==", taskId)
    .orderBy("created_at", "asc")
    .get();

  const comments = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TaskComment));

  const userIds = [...new Set(comments.map(c => c.user_id))];
  const userMap = new Map<string, string>();
  if (userIds.length > 0) {
    const userDocs = await Promise.all(userIds.map(id => db.collection("users").doc(id).get()));
    for (const doc of userDocs) {
      if (doc.exists) {
        const d = doc.data()!;
        userMap.set(doc.id, `${d.first_name ?? ""} ${d.last_name ?? ""}`.trim());
      }
    }
  }

  return comments.map(c => ({ ...c, user_name: userMap.get(c.user_id) ?? "" }));
}

export async function createComment(taskId: string, userId: string, message: string): Promise<TaskComment> {
  const ref = await db.collection("task_comments").add({
    task_id: taskId,
    user_id: userId,
    message,
    created_at: new Date().toISOString(),
  });

  return {
    id: ref.id,
    task_id: taskId,
    user_id: userId,
    message,
    created_at: new Date().toISOString(),
  };
}
