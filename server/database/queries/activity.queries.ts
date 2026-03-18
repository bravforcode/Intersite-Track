import { query } from "../connection.js";

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
  const sql = `
    SELECT a.*, 
           case when a.user_id is not null then u.first_name || ' ' || u.last_name else 'System' end as user_name,
           'audit' as type
    FROM task_audit_logs a
    LEFT JOIN users u ON a.user_id = u.id
    WHERE a.task_id = $1
    ORDER BY a.created_at DESC
  `;
  const result = await query<TaskActivity>(sql, [taskId]);
  return result.rows;
}
