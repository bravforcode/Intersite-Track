import { PoolClient } from "pg";
import { query } from "../database/connection.js";

export async function createAuditLog(
  taskId: number,
  userId: number | null,
  action: string,
  oldData: any = null,
  newData: any = null,
  client?: PoolClient
): Promise<void> {
  const sql = `
    INSERT INTO task_audit_logs (task_id, user_id, action, old_data, new_data)
    VALUES ($1, $2, $3, $4, $5)
  `;
  const params = [
    taskId,
    userId,
    action,
    oldData ? JSON.stringify(oldData) : null,
    newData ? JSON.stringify(newData) : null,
  ];

  if (client) {
    await client.query(sql, params);
  } else {
    await query(sql, params);
  }
}
