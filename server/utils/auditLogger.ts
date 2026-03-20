import { PoolClient } from "pg";
import { supabaseAdmin } from "../config/supabase.js";

export async function createAuditLog(
  taskId: number,
  userId: number | null,
  action: string,
  oldData: any = null,
  newData: any = null,
  client?: PoolClient
): Promise<void> {
  void client;

  const { error } = await supabaseAdmin
    .from("task_audit_logs")
    .insert({
      task_id: taskId,
      user_id: userId,
      action,
      old_data: oldData,
      new_data: newData,
    });

  if (error) throw error;
}
