import { query, transaction } from "../connection";

export interface TaskFilters {
  search?: string;
  status?: string;
  priority?: string;
  assignee?: string;
  date_from?: string;
  date_to?: string;
  user_id?: string;
}

export interface TaskAssignment {
  id: number;
  first_name: string;
  last_name: string;
}

export interface CreateTaskDTO {
  title: string;
  description?: string;
  task_type_id?: number | null;
  priority?: string;
  due_date?: string;
  created_by: number;
}

export interface UpdateTaskDTO {
  title: string;
  description?: string;
  task_type_id?: number | null;
  priority: string;
  status: string;
  due_date?: string;
}

const TASK_SELECT = `
  SELECT t.*, u.first_name || ' ' || u.last_name as creator_name, tt.name as task_type_name
  FROM tasks t
  JOIN users u ON t.created_by = u.id
  LEFT JOIN task_types tt ON t.task_type_id = tt.id
`;

export async function findAllTasks(filters: TaskFilters = {}): Promise<Record<string, unknown>[]> {
  let sql = TASK_SELECT;
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (filters.user_id) {
    sql += ` JOIN task_assignments ta_filter ON t.id = ta_filter.task_id AND ta_filter.user_id = $${idx++}`;
    params.push(filters.user_id);
  }
  if (filters.search) {
    conditions.push(`(t.title ILIKE $${idx} OR t.description ILIKE $${idx + 1})`);
    params.push(`%${filters.search}%`, `%${filters.search}%`);
    idx += 2;
  }
  if (filters.status) { conditions.push(`t.status = $${idx++}`); params.push(filters.status); }
  if (filters.priority) { conditions.push(`t.priority = $${idx++}`); params.push(filters.priority); }
  if (filters.assignee) {
    conditions.push(`t.id IN (SELECT task_id FROM task_assignments WHERE user_id = $${idx++})`);
    params.push(filters.assignee);
  }
  if (filters.date_from) { conditions.push(`t.due_date >= $${idx++}`); params.push(filters.date_from); }
  if (filters.date_to) { conditions.push(`t.due_date <= $${idx++}`); params.push(filters.date_to); }

  if (conditions.length > 0) sql += " WHERE " + conditions.join(" AND ");
  sql += " ORDER BY t.created_at DESC";

  const result = await query<Record<string, unknown>>(sql, params);
  return result.rows;
}

export async function findTaskById(id: number): Promise<Record<string, unknown> | null> {
  const result = await query<Record<string, unknown>>(
    `${TASK_SELECT} WHERE t.id = $1`, [id]
  );
  return result.rows[0] ?? null;
}

export async function createTask(dto: CreateTaskDTO): Promise<number> {
  const result = await query<{ id: number }>(
    `INSERT INTO tasks (title, description, task_type_id, priority, due_date, created_by)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [dto.title, dto.description, dto.task_type_id ?? null,
     dto.priority ?? "medium", dto.due_date, dto.created_by]
  );
  return result.rows[0].id;
}

export async function updateTask(id: number, dto: UpdateTaskDTO): Promise<void> {
  await query(
    `UPDATE tasks SET title=$1, description=$2, task_type_id=$3, priority=$4,
     status=$5, due_date=$6, updated_at=CURRENT_TIMESTAMP WHERE id=$7`,
    [dto.title, dto.description, dto.task_type_id ?? null,
     dto.priority, dto.status, dto.due_date, id]
  );
}

export async function deleteTask(id: number): Promise<void> {
  await query("DELETE FROM tasks WHERE id = $1", [id]);
}

export async function updateTaskStatus(id: number, status: string, progress: number): Promise<void> {
  await query(
    "UPDATE tasks SET status=$1, progress=$2, updated_at=CURRENT_TIMESTAMP WHERE id=$3",
    [status, progress, id]
  );
}

export async function getTaskAssignments(taskId: number): Promise<TaskAssignment[]> {
  const result = await query<TaskAssignment>(
    `SELECT u.id, u.first_name, u.last_name
     FROM task_assignments ta JOIN users u ON ta.user_id = u.id
     WHERE ta.task_id = $1`,
    [taskId]
  );
  return result.rows;
}

export async function setTaskAssignments(
  client: import("pg").PoolClient,
  taskId: number,
  userIds: number[]
): Promise<void> {
  await client.query("DELETE FROM task_assignments WHERE task_id = $1", [taskId]);
  for (const uid of userIds) {
    await client.query(
      "INSERT INTO task_assignments (task_id, user_id) VALUES ($1, $2)",
      [taskId, uid]
    );
  }
}

export async function getCurrentAssignments(taskId: number): Promise<number[]> {
  const result = await query<{ user_id: number }>(
    "SELECT user_id FROM task_assignments WHERE task_id = $1", [taskId]
  );
  return result.rows.map(r => r.user_id);
}
