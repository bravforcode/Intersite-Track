import { supabaseAdmin } from "../../config/supabase.js";

export type ChecklistTaskStatus = "pending" | "in_progress" | "completed" | "cancelled";

interface ChecklistUserRelation {
  first_name: string | null;
  last_name: string | null;
}

export interface ChecklistRow {
  id: number;
  task_id: number;
  parent_id: number | null;
  title: string;
  is_checked: boolean | number | null;
  sort_order: number | null;
  checked_by?: number | null;
  checked_at?: string | null;
  checked_user?: ChecklistUserRelation | ChecklistUserRelation[] | null;
}

function pickUserRelation(
  value: ChecklistUserRelation | ChecklistUserRelation[] | null | undefined
): ChecklistUserRelation | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export function isChecklistChecked(value: unknown): boolean {
  return value === true || value === 1 || value === "1";
}

export function getChecklistPathMap(
  rows: Array<Pick<ChecklistRow, "id" | "parent_id" | "sort_order">>
): Map<number, string> {
  const sortedRows = [...rows].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.id - b.id
  );
  const parents = sortedRows.filter((row) => row.parent_id == null);
  const childrenByParent = new Map<number, Array<Pick<ChecklistRow, "id" | "parent_id" | "sort_order">>>();

  for (const row of sortedRows) {
    if (row.parent_id == null) continue;
    const siblings = childrenByParent.get(row.parent_id) ?? [];
    siblings.push(row);
    childrenByParent.set(row.parent_id, siblings);
  }

  const pathMap = new Map<number, string>();

  parents.forEach((parent, parentIndex) => {
    const parentPath = `${parentIndex + 1}`;
    pathMap.set(parent.id, parentPath);

    const children = childrenByParent.get(parent.id) ?? [];
    children
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.id - b.id)
      .forEach((child, childIndex) => {
        pathMap.set(child.id, `${parentPath}.${childIndex + 1}`);
      });
  });

  return pathMap;
}

export function summarizeChecklistRows(
  rows: Array<Pick<ChecklistRow, "id" | "parent_id" | "is_checked">>,
  currentStatus: ChecklistTaskStatus = "pending"
): {
  hasChecklist: boolean;
  total: number;
  checked: number;
  progress: number;
  status: ChecklistTaskStatus;
} {
  const parentIdsWithChildren = new Set<number>();

  for (const row of rows) {
    if (row.parent_id != null) {
      parentIdsWithChildren.add(row.parent_id);
    }
  }

  // Count only actionable checklist items.
  // Group headers that own children do not contribute to progress.
  const countableRows = rows.filter((row) => !parentIdsWithChildren.has(row.id));
  const total = countableRows.length;
  const checked = countableRows.filter((row) => isChecklistChecked(row.is_checked)).length;
  const progress = total > 0 ? Math.round((checked / total) * 100) : 0;
  const status: ChecklistTaskStatus =
    currentStatus === "cancelled"
      ? "cancelled"
      : progress >= 100
        ? "completed"
        : progress > 0
          ? "in_progress"
          : "pending";

  return {
    hasChecklist: rows.length > 0,
    total,
    checked,
    progress,
    status,
  };
}

export async function getChecklistRowsByTaskIds(taskIds: number[]): Promise<ChecklistRow[]> {
  if (taskIds.length === 0) {
    return [];
  }

  const { data, error } = await supabaseAdmin
    .from("task_checklists")
    .select("id, task_id, parent_id, title, is_checked, sort_order, checked_by, checked_at")
    .in("task_id", taskIds)
    .order("task_id", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });

  if (error) throw error;
  return (data ?? []) as ChecklistRow[];
}

export async function getChecklistRowsWithUsers(
  taskId: number
): Promise<Array<ChecklistRow & { checked_by_name: string | null }>> {
  const { data, error } = await supabaseAdmin
    .from("task_checklists")
    .select(`
      id,
      task_id,
      parent_id,
      title,
      is_checked,
      sort_order,
      checked_by,
      checked_at,
      checked_user:users!task_checklists_checked_by_fkey(first_name,last_name)
    `)
    .eq("task_id", taskId)
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row: any) => {
    const checkedUser = pickUserRelation(row.checked_user);
    const checkedByName = checkedUser
      ? `${checkedUser.first_name ?? ""} ${checkedUser.last_name ?? ""}`.trim() || null
      : null;

    return {
      ...row,
      checked_by_name: checkedByName,
    };
  });
}
