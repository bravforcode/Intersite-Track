import { query } from "../connection.js";

export interface TaskComment {
  id: number;
  task_id: number;
  user_id: number;
  message: string;
  created_at: string;
  user_name?: string;
}

export async function getCommentsByTaskId(taskId: number): Promise<TaskComment[]> {
  const sql = `
    SELECT c.*, u.first_name || ' ' || u.last_name as user_name
    FROM task_comments c
    JOIN users u ON c.user_id = u.id
    WHERE c.task_id = $1
    ORDER BY c.created_at ASC
  `;
  const result = await query<TaskComment>(sql, [taskId]);
  return result.rows;
}

export async function createComment(taskId: number, userId: number, message: string): Promise<TaskComment> {
  const sql = `
    INSERT INTO task_comments (task_id, user_id, message)
    VALUES ($1, $2, $3)
    RETURNING *
  `;
  const result = await query<TaskComment>(sql, [taskId, userId, message]);
  return result.rows[0];
}
