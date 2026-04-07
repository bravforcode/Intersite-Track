import { db } from "../config/firebase-admin.js";

export async function createAuditLog(
  taskId: string,
  userId: string | null,
  action: string,
  oldData: any = null,
  newData: any = null
): Promise<void> {
  await db.collection("task_audit_logs").add({
    task_id: taskId,
    user_id: userId,
    action,
    old_data: oldData,
    new_data: newData,
    created_at: new Date().toISOString(),
  });
}
