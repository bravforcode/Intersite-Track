import { supabaseAdmin } from "../../config/supabase.js";

export interface TaskActivity {
  id: number;
  task_id: number;
  user_id: number | null;
  action: string;
  old_data: any;
  new_data: any;
  created_at: string;
  user_name?: string;
  type: "audit";
}

export async function getActivityByTaskId(taskId: number): Promise<TaskActivity[]> {
  const { data, error } = await supabaseAdmin
    .from("task_audit_logs")
    .select(`
      id,
      task_id,
      user_id,
      action,
      old_data,
      new_data,
      created_at,
      user:users!task_audit_logs_user_id_fkey(first_name,last_name)
    `)
    .eq("task_id", taskId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    id: row.id,
    task_id: row.task_id,
    user_id: row.user_id,
    action: row.action,
    old_data: row.old_data,
    new_data: row.new_data,
    created_at: row.created_at,
    user_name: row.user ? `${row.user.first_name ?? ""} ${row.user.last_name ?? ""}`.trim() || "System" : "System",
    type: "audit" as const,
  }));
}

export async function getAllActivity(limit: number = 50): Promise<TaskActivity[]> {
  const { data, error } = await supabaseAdmin
    .from("task_audit_logs")
    .select(`
      id,
      task_id,
      user_id,
      action,
      old_data,
      new_data,
      created_at,
      task:tasks(title),
      user:users!task_audit_logs_user_id_fkey(first_name,last_name)
    `)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    id: row.id,
    task_id: row.task_id,
    task_title: row.task?.title || "Unknown Task",
    user_id: row.user_id,
    action: row.action,
    old_data: row.old_data,
    new_data: row.new_data,
    created_at: row.created_at,
    user_name: row.user ? `${row.user.first_name ?? ""} ${row.user.last_name ?? ""}`.trim() || "System" : "System",
    type: "audit" as const,
  }));
}
