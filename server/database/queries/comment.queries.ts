import { supabaseAdmin } from "../../config/supabase.js";

export interface TaskComment {
  id: number;
  task_id: number;
  user_id: number;
  message: string;
  created_at: string;
  user_name?: string;
}

export async function getCommentsByTaskId(taskId: number): Promise<TaskComment[]> {
  const { data, error } = await supabaseAdmin
    .from("task_comments")
    .select(`
      id,
      task_id,
      user_id,
      message,
      created_at,
      user:users!task_comments_user_id_fkey(first_name,last_name)
    `)
    .eq("task_id", taskId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    id: row.id,
    task_id: row.task_id,
    user_id: row.user_id,
    message: row.message,
    created_at: row.created_at,
    user_name: row.user ? `${row.user.first_name ?? ""} ${row.user.last_name ?? ""}`.trim() : "",
  }));
}

export async function createComment(taskId: number, userId: number, message: string): Promise<TaskComment> {
  const { data, error } = await supabaseAdmin
    .from("task_comments")
    .insert({
      task_id: taskId,
      user_id: userId,
      message,
    })
    .select("id, task_id, user_id, message, created_at")
    .single();

  if (error || !data) throw error ?? new Error("Failed to create comment");

  return data as TaskComment;
}
