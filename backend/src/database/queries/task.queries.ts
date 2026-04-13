import { db } from "../../config/firebase-admin.js";
import { getChecklistRowsByTaskIds, summarizeChecklistRows } from "./checklist.queries.js";
import { slaService } from "../../services/sla.service.js";

export type TaskStatus = "pending" | "in_progress" | "completed" | "cancelled";
export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface TaskFilters {
  search?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignee?: string;
  date_from?: string;
  date_to?: string;
  dateFrom?: string;
  dateTo?: string;
  user_id?: string;
  userId?: string;
}

export interface TaskAssignment {
  id: string;
  first_name: string;
  last_name: string;
  line_user_id?: string | null;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  task_type_id: string | null;
  task_type_name?: string;
  priority: TaskPriority;
  status: TaskStatus;
  due_date: string | null;
  progress: number;
  created_at: string;
  updated_at: string;
  created_by: string;
  creator_name: string;
  assignments?: TaskAssignment[];
  project_id?: string | null;
  project_name?: string;
  is_blocked?: boolean;
  tags?: string[];
  sla_enabled?: boolean;
  sla_target_days?: number;
  sla_anchor_date?: string;
  sla_deadline_date?: string | null;
  sla_status?: "fine" | "warning" | "breached";
  sla_status_updated_at?: string;
  sla_elapsed_business_days?: number;
  sla_alert_state?: "none" | "warning_sent" | "breach_sent";
  sla_last_alerted_at?: string;
  sla_breached_at?: string | null;
  met_sla?: boolean;
}

export interface CreateTaskDTO {
  title: string;
  description?: string;
  task_type_id?: string | null;
  priority?: TaskPriority;
  status?: TaskStatus;
  due_date?: string | null;
  created_by: string;
  project_id?: string | null;
  tags?: string[];
  creator_name?: string;
  task_type_name?: string;
}

export interface UpdateTaskDTO {
  title?: string;
  description?: string;
  task_type_id?: string | null;
  priority?: TaskPriority;
  status?: TaskStatus;
  due_date?: string | null;
  project_id?: string | null;
  tags?: string[];
}

function mapTask(id: string, data: FirebaseFirestore.DocumentData): Task {
  return {
    id,
    title: data.title ?? "",
    description: data.description ?? null,
    task_type_id: data.task_type_id ?? null,
    task_type_name: data.task_type_name ?? undefined,
    priority: data.priority ?? "medium",
    status: data.status ?? "pending",
    due_date: data.due_date ?? null,
    progress: data.progress ?? 0,
    created_at: data.created_at ?? new Date().toISOString(),
    updated_at: data.updated_at ?? new Date().toISOString(),
    created_by: data.created_by ?? "",
    creator_name: data.creator_name ?? "",
    project_id: data.project_id ?? null,
    project_name: data.project_name ?? undefined,
    tags: data.tags ?? [],
    is_blocked: data.is_blocked ?? false,
    sla_enabled: data.sla_enabled ?? false,
    sla_target_days: data.sla_target_days,
    sla_anchor_date: data.sla_anchor_date,
    sla_deadline_date: data.sla_deadline_date ?? null,
    sla_status: data.sla_status ?? "fine",
    sla_status_updated_at: data.sla_status_updated_at,
    sla_elapsed_business_days: data.sla_elapsed_business_days ?? 0,
    sla_alert_state: data.sla_alert_state ?? "none",
    sla_last_alerted_at: data.sla_last_alerted_at,
    sla_breached_at: data.sla_breached_at ?? null,
    met_sla: data.met_sla,
    assignments: (data.assignee_details ?? []) as TaskAssignment[],
  };
}

async function applyChecklistState(tasks: Task[]): Promise<Task[]> {
  if (tasks.length === 0) return tasks;

  const checklistRows = await getChecklistRowsByTaskIds(tasks.map(t => t.id));
  const rowsByTaskId = new Map<string, typeof checklistRows>();
  for (const row of checklistRows) {
    const rows = rowsByTaskId.get(row.task_id) ?? [];
    rows.push(row);
    rowsByTaskId.set(row.task_id, rows);
  }

  return tasks.map(task => {
    const rows = rowsByTaskId.get(task.id) ?? [];
    const summary = summarizeChecklistRows(rows, task.status);
    if (!summary.hasChecklist) return task;
    return { ...task, progress: summary.progress, status: summary.status };
  });
}

function normalizeFilters(filters: TaskFilters = {}) {
  return {
    search: filters.search?.trim().toLowerCase(),
    status: filters.status,
    priority: filters.priority,
    assignee: filters.assignee || undefined,
    dateFrom: filters.dateFrom ?? filters.date_from,
    dateTo: filters.dateTo ?? filters.date_to,
    userId: filters.userId || filters.user_id || undefined,
  };
}

export async function findAllTasks(filters: TaskFilters = {}): Promise<Task[]> {
  const snap = await db.collection("tasks").orderBy("created_at", "desc").get();
  const tasks = snap.docs.map(doc => mapTask(doc.id, doc.data()));
  const withChecklists = await applyChecklistState(tasks);

  const normalized = normalizeFilters(filters);

  return withChecklists.filter(task => {
    if (normalized.search) {
      const haystack = `${task.title} ${task.description ?? ""}`.toLowerCase();
      if (!haystack.includes(normalized.search)) return false;
    }
    if (normalized.status && task.status !== normalized.status) return false;
    if (normalized.priority && task.priority !== normalized.priority) return false;
    if (normalized.assignee) {
      if (!task.assignments?.some(a => a.id === normalized.assignee)) return false;
    }
    if (normalized.userId) {
      if (!task.assignments?.some(a => a.id === normalized.userId)) return false;
    }
    if (normalized.dateFrom && task.due_date && task.due_date < normalized.dateFrom) return false;
    if (normalized.dateFrom && !task.due_date) return false;
    if (normalized.dateTo && task.due_date && task.due_date > normalized.dateTo) return false;
    if (normalized.dateTo && !task.due_date) return false;
    return true;
  });
}

export async function findTaskById(id: string): Promise<Task | null> {
  const doc = await db.collection("tasks").doc(id).get();
  if (!doc.exists) return null;
  const [task] = await applyChecklistState([mapTask(doc.id, doc.data()!)]);
  return task ?? null;
}

export async function createTask(dto: CreateTaskDTO): Promise<string> {
  const ref = db.collection("tasks").doc();
  const created_at = new Date().toISOString();
  
  const priority = dto.priority ?? "medium";
  const slaInitial = await slaService.calculateInitialSLA(created_at, priority);

  await ref.set({
    title: dto.title,
    description: dto.description ?? null,
    task_type_id: dto.task_type_id ?? null,
    task_type_name: dto.task_type_name ?? null,
    priority,
    status: dto.status ?? "pending",
    due_date: dto.due_date ?? null,
    progress: 0,
    created_by: dto.created_by,
    creator_name: dto.creator_name ?? "",
    project_id: dto.project_id ?? null,
    tags: dto.tags ?? [],
    assignees: [],
    assignee_details: [],
    is_blocked: false,
    created_at,
    updated_at: created_at,
    ...slaInitial
  });
  return ref.id;
}

export async function updateTask(id: string, dto: UpdateTaskDTO): Promise<void> {
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (dto.title !== undefined) payload.title = dto.title;
  if (dto.description !== undefined) payload.description = dto.description ?? null;
  if (dto.task_type_id !== undefined) payload.task_type_id = dto.task_type_id ?? null;
  
  if (dto.priority !== undefined) {
    payload.priority = dto.priority;
    const existingTask = await findTaskById(id);
    if (existingTask && existingTask.priority !== dto.priority && existingTask.sla_anchor_date) {
      const newSla = await slaService.recomputeForPriorityChange(existingTask.sla_anchor_date, dto.priority);
      Object.assign(payload, newSla);
    }
  }

  if (dto.status !== undefined) payload.status = dto.status;
  if (dto.due_date !== undefined) payload.due_date = dto.due_date ?? null;
  if (dto.project_id !== undefined) payload.project_id = dto.project_id ?? null;
  if (dto.tags !== undefined) payload.tags = dto.tags;
  await db.collection("tasks").doc(id).update(payload);
}

export async function deleteTask(id: string): Promise<void> {
  await db.collection("tasks").doc(id).delete();
}

export async function updateTaskStatus(id: string, status: TaskStatus, progress: number): Promise<void> {
  const payload: Record<string, unknown> = {
    status,
    progress,
    updated_at: new Date().toISOString(),
  };

  const existing = await findTaskById(id);
  if (existing) {
    if (status === "completed" || status === "cancelled") {
      // Freeze logic: Check if it already has met_sla
      if (existing.met_sla === undefined || existing.met_sla === null) {
        if (existing.sla_status === "breached") {
          payload.met_sla = false;
        } else if (existing.sla_anchor_date && existing.sla_deadline_date) {
          const finalEval = await slaService.evaluateStatus(
            existing.sla_anchor_date,
            existing.sla_deadline_date,
            payload.updated_at as string
          );
          payload.met_sla = finalEval.status !== "breached";
        }
      }
    } else if (existing.status === "completed" || existing.status === "cancelled") {
      // Reopen logic: task is returning to active state
      const refreshedSla = await slaService.calculateInitialSLA(payload.updated_at as string, existing.priority);
      Object.assign(payload, refreshedSla);
      payload.met_sla = null; // Reset SLA completion flag
    }
  }

  await db.collection("tasks").doc(id).update(payload);
}

export async function getTaskAssignments(taskId: string): Promise<TaskAssignment[]> {
  const doc = await db.collection("tasks").doc(taskId).get();
  return doc.exists ? (doc.data()?.assignee_details ?? []) : [];
}

export async function getCurrentAssignments(taskId: string): Promise<string[]> {
  const doc = await db.collection("tasks").doc(taskId).get();
  return doc.exists ? (doc.data()?.assignees ?? []) : [];
}

export async function setTaskAssignments(
  _client: null | undefined,
  taskId: string,
  userIds: string[]
): Promise<void> {
  let assigneeDetails: TaskAssignment[] = [];

  if (userIds.length > 0) {
    const userDocs = await Promise.all(userIds.map(id => db.collection("users").doc(id).get()));
    assigneeDetails = userDocs
      .filter(doc => doc.exists)
      .map(doc => ({
        id: doc.id,
        first_name: doc.data()?.first_name ?? "",
        last_name: doc.data()?.last_name ?? "",
      }));
  }

  await db.collection("tasks").doc(taskId).update({
    assignees: userIds,
    assignee_details: assigneeDetails,
    updated_at: new Date().toISOString(),
  });
}

export async function getTaskBlockers(taskId: string): Promise<any[]> {
  const snap = await db
    .collection("task_blockers")
    .where("task_id", "==", taskId)
    .get();
  return snap.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .sort((left: any, right: any) => String(right.created_at ?? "").localeCompare(String(left.created_at ?? "")));
}

export const findAll = findAllTasks;

// ──────────────────────────────────────────────────── 
// OPTIMIZED QUERIES (Use compound indexes from firestore.indexes.json)
// These replace full-collection scans with Firestore-filtered queries
// ──────────────────────────────────────────────────── 

/**
 * Find tasks by status with pagination
 * ✅ Uses index: tasks(status, created_at DESC)
 * ✅ Replaces full-collection scan
 */
export async function findTasksByStatus(
  status: TaskStatus,
  limit: number = 100
): Promise<Task[]> {
  const snap = await db
    .collection("tasks")
    .where("status", "==", status)
    .orderBy("created_at", "desc")
    .limit(limit)
    .get();
  
  const tasks = snap.docs.map(doc => mapTask(doc.id, doc.data()));
  return await applyChecklistState(tasks);
}

/**
 * Find tasks by priority with optional status filter
 * ✅ Uses index: tasks(priority, status, created_at DESC)
 * ✅ Compound filter in Firestore
 */
export async function findTasksByPriority(
  priority: TaskPriority,
  status?: TaskStatus,
  limit: number = 100
): Promise<Task[]> {
  let query = db
    .collection("tasks")
    .where("priority", "==", priority);
  
  if (status) {
    query = query.where("status", "==", status);
  }
  
  const snap = await query
    .orderBy("created_at", "desc")
    .limit(limit)
    .get();
  
  const tasks = snap.docs.map(doc => mapTask(doc.id, doc.data()));
  return await applyChecklistState(tasks);
}

/**
 * Find tasks by project with optional status filter
 * ✅ Uses index: tasks(project_id, status, created_at DESC)
 * ✅ Replaces in-memory project filtering
 */
export async function findTasksByProject(
  projectId: string,
  status?: TaskStatus,
  limit: number = 100
): Promise<Task[]> {
  let query = db
    .collection("tasks")
    .where("project_id", "==", projectId);
  
  if (status) {
    query = query.where("status", "==", status);
  }
  
  const snap = await query
    .orderBy("created_at", "desc")
    .limit(limit)
    .get();
  
  const tasks = snap.docs.map(doc => mapTask(doc.id, doc.data()));
  return await applyChecklistState(tasks);
}

/**
 * Find tasks assigned to a user
 * ✅ Uses index: tasks(assignees CONTAINS, created_at DESC)
 * ✅ Replaces in-memory assignment filtering
 */
export async function findTasksByAssignee(
  userId: string,
  status?: TaskStatus,
  limit: number = 100
): Promise<Task[]> {
  let query = db
    .collection("tasks")
    .where("assignees", "array-contains", userId);
  
  if (status) {
    query = query.where("status", "==", status);
  }
  
  const snap = await query
    .orderBy("created_at", "desc")
    .limit(limit)
    .get();
  
  const tasks = snap.docs.map(doc => mapTask(doc.id, doc.data()));
  return await applyChecklistState(tasks);
}

/**
 * Find tasks by due date range (for deadline-based queries)
 * ✅ Uses index: tasks(due_date, status)
 */
export async function findTasksByDueDateRange(
  dateFrom: string,
  dateTo: string,
  status?: TaskStatus,
  limit: number = 100
): Promise<Task[]> {
  let query = db
    .collection("tasks")
    .where("due_date", ">=", dateFrom)
    .where("due_date", "<=", dateTo);
  
  if (status) {
    query = query.where("status", "==", status);
  }
  
  const snap = await query
    .limit(limit)
    .get();
  
  const tasks = snap.docs.map(doc => mapTask(doc.id, doc.data()));
  return await applyChecklistState(tasks);
}
export const findById = findTaskById;
export const create = createTask;
export const update = updateTask;
export const updateStatus = updateTaskStatus;
export const getAssignments = getTaskAssignments;
export const setAssignments = (taskId: string, userIds: string[]) =>
  setTaskAssignments(undefined, taskId, userIds);
