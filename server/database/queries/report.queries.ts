import { query } from "../connection.js";

export interface StaffReportRow {
  id: number;
  first_name: string;
  last_name: string;
  role: "admin" | "staff";
  position: string;
  department_name: string;
  total_tasks: number;
  completed: number;
  in_progress: number;
  pending: number;
}

export async function getStaffReport(): Promise<StaffReportRow[]> {
  const result = await query<StaffReportRow>(`
    SELECT u.id, u.first_name, u.last_name, u.role, u.position, d.name as department_name,
      COUNT(ta.task_id)::int as total_tasks,
      COUNT(ta.task_id) FILTER (WHERE t.status = 'completed')::int as completed,
      COUNT(ta.task_id) FILTER (WHERE t.status = 'in_progress')::int as in_progress,
      COUNT(ta.task_id) FILTER (WHERE t.status = 'pending')::int as pending
    FROM users u
    LEFT JOIN task_assignments ta ON u.id = ta.user_id
    LEFT JOIN tasks t ON ta.task_id = t.id
    LEFT JOIN departments d ON u.department_id = d.id
    GROUP BY u.id, u.first_name, u.last_name, u.role, u.position, d.name
    ORDER BY total_tasks DESC
  `);
  return result.rows;
}

export async function getTasksByDateRange(
  start: string,
  end: string
): Promise<Record<string, unknown>[]> {
  const result = await query<Record<string, unknown>>(`
    SELECT
      t.due_date::text as date,
      t.status,
      COUNT(*)::int as count
    FROM tasks t
    WHERE t.due_date BETWEEN $1 AND $2
    GROUP BY t.due_date, t.status
    ORDER BY t.due_date ASC, t.status ASC
  `, [start, end]);
  return result.rows;
}

export async function getStats(): Promise<{
  total: number; completed: number; inProgress: number; pending: number; cancelled: number;
}> {
  const result = await query<{
    total: string; completed: string; inProgress: string; pending: string; cancelled: string;
  }>(`
    SELECT
      count(*) as total,
      count(*) FILTER (WHERE status = 'completed') as completed,
      count(*) FILTER (WHERE status = 'in_progress') as "inProgress",
      count(*) FILTER (WHERE status = 'pending') as pending,
      count(*) FILTER (WHERE status = 'cancelled') as cancelled
    FROM tasks
  `);
  const r = result.rows[0];
  return {
    total: Number(r.total),
    completed: Number(r.completed),
    inProgress: Number(r.inProgress),
    pending: Number(r.pending),
    cancelled: Number(r.cancelled),
  };
}
