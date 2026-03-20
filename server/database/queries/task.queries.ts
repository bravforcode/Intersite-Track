import type { PoolClient } from "pg";
import { query, transaction } from "../connection.js";

export type TaskStatus = "pending" | "in_progress" | "completed" | "cancelled";
export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface TaskFilters {
  search?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignee?: number | string;
  date_from?: string;
  date_to?: string;
  dateFrom?: string;
  dateTo?: string;
  user_id?: number | string;
  userId?: number | string;
}

export interface TaskAssignment {
  id: number;
  first_name: string;
  last_name: string;
}

interface TaskAssignmentRow extends TaskAssignment {
  task_id: number;
}

export interface Task {
  id: number;
  title: string;
  description: string | null;
  task_type_id: number | null;
  task_type_name?: string;
  priority: TaskPriority;
  status: TaskStatus;
  due_date: string | null;
  progress: number;
  created_at: string;
  updated_at: string;
  created_by: number;
  creator_name: string;
  assignments?: TaskAssignment[];
}

export interface CreateTaskDTO {
  title: string;
  description?: string;
  task_type_id?: number | null;
  priority?: TaskPriority;
  due_date?: string;
  created_by: number;
}

export interface UpdateTaskDTO {
  title?: string;
  description?: string;
  task_type_id?: number | null;
  priority?: TaskPriority;
  status?: TaskStatus;
  due_date?: string;
}

async function hydrateAssignments(tasks: Task[]): Promise<Task[]> {
  if (tasks.length === 0) return tasks;

  const taskIds = tasks.map(task => task.id);
  const assignmentResult = await query<TaskAssignmentRow>(
    `SELECT ta.task_id, u.id, u.first_name, u.last_name
     FROM task_assignments ta
     JOIN users u ON ta.user_id = u.id
     WHERE ta.task_id = ANY($1::int[])
     ORDER BY ta.task_id, u.first_name, u.last_name`,
    [taskIds]
  );

  const assignmentMap = new Map<number, TaskAssignment[]>();

  for (const row of assignmentResult.rows) {
    const current = assignmentMap.get(row.task_id) ?? [];
    current.push({
      id: row.id,
      first_name: row.first_name,
      last_name: row.last_name,
    });
    assignmentMap.set(row.task_id, current);
  }

  return tasks.map(task => ({
    ...task,
    assignments: assignmentMap.get(task.id) ?? [],
  }));
}

const TASK_SELECT = `
  SELECT
    t.*,
    creator.first_name || ' ' || creator.last_name AS creator_name,
    tt.name AS task_type_name
  FROM tasks t
  JOIN users creator ON t.created_by = creator.id
  LEFT JOIN task_types tt ON t.task_type_id = tt.id
`;

function normalizeFilters(filters: TaskFilters = {}) {
  return {
    search: filters.search,
    status: filters.status,
    priority: filters.priority,
    assignee:
      filters.assignee !== undefined && filters.assignee !== ""
        ? Number(filters.assignee)
        : undefined,
    dateFrom: filters.dateFrom ?? filters.date_from,
    dateTo: filters.dateTo ?? filters.date_to,
    userId:
      filters.userId !== undefined && filters.userId !== ""
        ? Number(filters.userId)
        : filters.user_id !== undefined && filters.user_id !== ""
          ? Number(filters.user_id)
          : undefined,
  };
}

export async function findAllTasks(filters: TaskFilters = {}): Promise<Task[]> {
  const normalized = normalizeFilters(filters);

  let sql = TASK_SELECT;
  const conditions: string[] = [];
  const params: Array<string | number> = [];
  let idx = 1;

  if (normalized.userId) {
    sql += ` JOIN task_assignments ta_filter ON t.id = ta_filter.task_id AND ta_filter.user_id = $${idx++}`;
    params.push(normalized.userId);
  }

  if (normalized.search) {
    conditions.push(`(t.title ILIKE $${idx} OR COALESCE(t.description, '') ILIKE $${idx + 1})`);
    params.push(`%${normalized.search}%`, `%${normalized.search}%`);
    idx += 2;
  }

  if (normalized.status) {
    conditions.push(`t.status = $${idx++}`);
    params.push(normalized.status);
  }

  if (normalized.priority) {
    conditions.push(`t.priority = $${idx++}`);
    params.push(normalized.priority);
  }

  if (normalized.assignee) {
    conditions.push(`t.id IN (SELECT task_id FROM task_assignments WHERE user_id = $${idx++})`);
    params.push(normalized.assignee);
  }

  if (normalized.dateFrom) {
    conditions.push(`t.due_date >= $${idx++}`);
    params.push(normalized.dateFrom);
  }

  if (normalized.dateTo) {
    conditions.push(`t.due_date <= $${idx++}`);
    params.push(normalized.dateTo);
  }

  if (conditions.length > 0) {
    sql += " WHERE " + conditions.join(" AND ");
  }

  sql += " ORDER BY t.created_at DESC";

  const result = await query<Task>(sql, params);
  return hydrateAssignments(result.rows);
}

export async function findTaskById(id: number): Promise<Task | null> {
  const result = await query<Task>(`${TASK_SELECT} WHERE t.id = $1`, [id]);
  const task = result.rows[0] ?? null;
  if (!task) return null;
  const [hydratedTask] = await hydrateAssignments([task]);
  return hydratedTask ?? null;
}

export async function createTask(dto: CreateTaskDTO): Promise<number> {
  const result = await query<{ id: number }>(
    `INSERT INTO tasks (title, description, task_type_id, priority, due_date, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [
      dto.title,
      dto.description ?? null,
      dto.task_type_id ?? null,
      dto.priority ?? "medium",
      dto.due_date ?? null,
      dto.created_by,
    ]
  );

  return result.rows[0].id;
}

export async function updateTask(id: number, dto: UpdateTaskDTO): Promise<void> {
  await query(
    `UPDATE tasks
     SET title = $1,
         description = $2,
         task_type_id = $3,
         priority = $4,
         status = $5,
         due_date = $6,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $7`,
    [
      dto.title,
      dto.description ?? null,
      dto.task_type_id ?? null,
      dto.priority,
      dto.status,
      dto.due_date ?? null,
      id,
    ]
  );
}

export async function deleteTask(id: number): Promise<void> {
  await query("DELETE FROM tasks WHERE id = $1", [id]);
}

export async function updateTaskStatus(id: number, status: TaskStatus, progress: number): Promise<void> {
  await query(
    "UPDATE tasks SET status = $1, progress = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3",
    [status, progress, id]
  );
}

export async function getTaskAssignments(taskId: number): Promise<TaskAssignment[]> {
  const result = await query<TaskAssignment>(
    `SELECT u.id, u.first_name, u.last_name
     FROM task_assignments ta
     JOIN users u ON ta.user_id = u.id
     WHERE ta.task_id = $1`,
    [taskId]
  );

  return result.rows;
}

export async function getCurrentAssignments(taskId: number): Promise<number[]> {
  const result = await query<{ user_id: number }>(
    "SELECT user_id FROM task_assignments WHERE task_id = $1 ORDER BY user_id",
    [taskId]
  );

  return result.rows.map(row => row.user_id);
}

export async function setTaskAssignments(
  client: PoolClient,
  taskId: number,
  userIds: number[]
): Promise<void> {
  await client.query("DELETE FROM task_assignments WHERE task_id = $1", [taskId]);

  for (const userId of userIds) {
    await client.query(
      "INSERT INTO task_assignments (task_id, user_id) VALUES ($1, $2)",
      [taskId, userId]
    );
  }
}

export async function findAll(filters?: TaskFilters): Promise<Task[]> {
  return findAllTasks(filters);
}

export async function findById(id: number): Promise<Task | null> {
  return findTaskById(id);
}

export async function create(dto: CreateTaskDTO): Promise<number> {
  return createTask(dto);
}

export async function update(id: number, dto: UpdateTaskDTO): Promise<void> {
  await updateTask(id, dto);
}

export async function updateStatus(id: number, status: TaskStatus, progress: number): Promise<void> {
  await updateTaskStatus(id, status, progress);
}

export async function getAssignments(taskId: number): Promise<TaskAssignment[]> {
  return getTaskAssignments(taskId);
}

export async function setAssignments(taskId: number, userIds: number[]): Promise<void> {
  await transaction(async client => {
    await setTaskAssignments(client, taskId, userIds);
  });
}
