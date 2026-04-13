import { db } from "../config/firebase-admin.js";

export function sanitizeAuditPayload(value: unknown): unknown {
  if (value === undefined) return null;
  if (value === null) return null;
  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizeAuditPayload(item))
      .filter((item) => item !== undefined);
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, entryValue]) => entryValue !== undefined)
      .map(([key, entryValue]) => [key, sanitizeAuditPayload(entryValue)]);
    return Object.fromEntries(entries);
  }
  return value;
}

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
    old_data: sanitizeAuditPayload(oldData),
    new_data: sanitizeAuditPayload(newData),
    created_at: new Date().toISOString(),
  });
}
