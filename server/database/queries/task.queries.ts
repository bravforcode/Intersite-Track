import type { PoolClient } from "pg";
import { supabaseAdmin } from "../../config/supabase.js";
import { getChecklistRowsByTaskIds, summarizeChecklistRows } from "./checklist.queries.js";

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
  due_date?: string | null;
  created_by: number;
}

export interface UpdateTaskDTO {
  title?: string;
  description?: string;
  task_type_id?: number | null;
  priority?: TaskPriority;
  status?: TaskStatus;
  due_date?: string | null;
}

interface TaskRow {
  id: number;
  title: string;
  description: string | null;
  task_type_id: number | null;
  priority: TaskPriority;
  status: TaskStatus;
  due_date: string | null;
  progress: number;
  created_at: string;
  updated_at: string;
  created_by: number;
  creator:
    | { first_name: string | null; last_name: string | null }
    | Array<{ first_name: string | null; last_name: string | null }>
    | null;
  task_type: { name: string | null } | Array<{ name: string | null }> | null;
  task_assignments?:
    | Array<{ user: TaskAssignment | TaskAssignment[] | null }>
    | null;
}

function pickOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function mapTask(row: TaskRow): Task {
  const creator = pickOne(row.creator);
  const taskType = pickOne(row.task_type);
  const creatorFirst = creator?.first_name ?? "";
  const creatorLast = creator?.last_name ?? "";

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    task_type_id: row.task_type_id,
    task_type_name: taskType?.name ?? undefined,
    priority: row.priority,
    status: row.status,
    due_date: row.due_date,
    progress: row.progress,
    created_at: row.created_at,
    updated_at: row.updated_at,
    created_by: row.created_by,
    creator_name: `${creatorFirst} ${creatorLast}`.trim(),
    assignments: (row.task_assignments ?? [])
      .map((assignment) => pickOne(assignment.user))
      .filter((user): user is TaskAssignment => Boolean(user)),
  };
}

async function fetchTaskRows() {
  const { data, error } = await supabaseAdmin
    .from("tasks")
    .select(`
      id,
      title,
      description,
      task_type_id,
      priority,
      status,
      due_date,
      progress,
      created_at,
      updated_at,
      created_by,
      creator:users!tasks_created_by_fkey(first_name,last_name),
      task_type:task_types!tasks_task_type_id_fkey(name),
      task_assignments(user:users!task_assignments_user_id_fkey(id,first_name,last_name))
    `)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as TaskRow[];
}

async function applyChecklistState(tasks: Task[]): Promise<Task[]> {
  if (tasks.length === 0) {
    return tasks;
  }

  const checklistRows = await getChecklistRowsByTaskIds(tasks.map((task) => task.id));
  const rowsByTaskId = new Map<number, typeof checklistRows>();

  for (const row of checklistRows) {
    const rows = rowsByTaskId.get(row.task_id) ?? [];
    rows.push(row);
    rowsByTaskId.set(row.task_id, rows);
  }

  return tasks.map((task) => {
    const rows = rowsByTaskId.get(task.id) ?? [];
    const summary = summarizeChecklistRows(rows, task.status);

    if (!summary.hasChecklist) {
      return task;
    }

    return {
      ...task,
      progress: summary.progress,
      status: summary.status,
    };
  });
}

function normalizeFilters(filters: TaskFilters = {}) {
  return {
    search: filters.search?.trim().toLowerCase(),
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
  const tasks = await applyChecklistState((await fetchTaskRows()).map(mapTask));

  return tasks.filter((task) => {
    if (normalized.search) {
      const haystack = `${task.title} ${task.description ?? ""}`.toLowerCase();
      if (!haystack.includes(normalized.search)) return false;
    }

    if (normalized.status && task.status !== normalized.status) return false;
    if (normalized.priority && task.priority !== normalized.priority) return false;

    if (normalized.assignee) {
      const isAssigned = task.assignments?.some((assignment) => assignment.id === normalized.assignee) ?? false;
      if (!isAssigned) return false;
    }

    if (normalized.userId) {
      const isAssigned = task.assignments?.some((assignment) => assignment.id === normalized.userId) ?? false;
      if (!isAssigned) return false;
    }

    if (normalized.dateFrom && task.due_date && task.due_date < normalized.dateFrom) return false;
    if (normalized.dateFrom && !task.due_date) return false;
    if (normalized.dateTo && task.due_date && task.due_date > normalized.dateTo) return false;
    if (normalized.dateTo && !task.due_date) return false;

    return true;
  });
}

export async function findTaskById(id: number): Promise<Task | null> {
  const { data, error } = await supabaseAdmin
    .from("tasks")
    .select(`
      id,
      title,
      description,
      task_type_id,
      priority,
      status,
      due_date,
      progress,
      created_at,
      updated_at,
      created_by,
      creator:users!tasks_created_by_fkey(first_name,last_name),
      task_type:task_types!tasks_task_type_id_fkey(name),
      task_assignments(user:users!task_assignments_user_id_fkey(id,first_name,last_name))
    `)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const [task] = await applyChecklistState([mapTask(data as unknown as TaskRow)]);
  return task ?? null;
}

export async function createTask(dto: CreateTaskDTO): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from("tasks")
    .insert({
      title: dto.title,
      description: dto.description ?? null,
      task_type_id: dto.task_type_id ?? null,
      priority: dto.priority ?? "medium",
      due_date: dto.due_date ?? null,
      created_by: dto.created_by,
    })
    .select("id")
    .single();

  if (error || !data) throw error ?? new Error("Failed to create task");
  return data.id;
}

export async function updateTask(id: number, dto: UpdateTaskDTO): Promise<void> {
  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (dto.title !== undefined) payload.title = dto.title;
  if (dto.description !== undefined) payload.description = dto.description ?? null;
  if (dto.task_type_id !== undefined) payload.task_type_id = dto.task_type_id ?? null;
  if (dto.priority !== undefined) payload.priority = dto.priority;
  if (dto.status !== undefined) payload.status = dto.status;
  if (dto.due_date !== undefined) payload.due_date = dto.due_date ?? null;

  const { error } = await supabaseAdmin
    .from("tasks")
    .update(payload)
    .eq("id", id);

  if (error) throw error;
}

export async function deleteTask(id: number): Promise<void> {
  const { error } = await supabaseAdmin
    .from("tasks")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

export async function updateTaskStatus(id: number, status: TaskStatus, progress: number): Promise<void> {
  const { error } = await supabaseAdmin
    .from("tasks")
    .update({
      status,
      progress,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw error;
}

export async function getTaskAssignments(taskId: number): Promise<TaskAssignment[]> {
  const { data, error } = await supabaseAdmin
    .from("task_assignments")
    .select("user:users!task_assignments_user_id_fkey(id,first_name,last_name)")
    .eq("task_id", taskId);

  if (error) throw error;

  return (data ?? [])
    .map((row: any) => row.user)
    .filter((user): user is TaskAssignment => Boolean(user));
}

export async function getCurrentAssignments(taskId: number): Promise<number[]> {
  const { data, error } = await supabaseAdmin
    .from("task_assignments")
    .select("user_id")
    .eq("task_id", taskId)
    .order("user_id", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((row: any) => row.user_id);
}

export async function setTaskAssignments(
  _client: PoolClient | null | undefined,
  taskId: number,
  userIds: number[]
): Promise<void> {
  const { error: deleteError } = await supabaseAdmin
    .from("task_assignments")
    .delete()
    .eq("task_id", taskId);

  if (deleteError) throw deleteError;

  if (userIds.length === 0) {
    return;
  }

  const { error: insertError } = await supabaseAdmin
    .from("task_assignments")
    .insert(userIds.map((userId) => ({ task_id: taskId, user_id: userId })));

  if (insertError) throw insertError;
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
  await setTaskAssignments(undefined, taskId, userIds);
}
