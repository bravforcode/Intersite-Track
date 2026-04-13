import { db } from "../../config/firebase-admin.js";

export type ChecklistTaskStatus = "pending" | "in_progress" | "completed" | "cancelled";

export interface ChecklistRow {
  id: string;
  task_id: string;
  parent_id: string | null;
  title: string;
  is_checked: boolean | number | null;
  sort_order: number | null;
  checked_by?: string | null;
  checked_at?: string | null;
}

export function sortChecklistRows<T extends Pick<ChecklistRow, "task_id" | "sort_order" | "id">>(rows: T[]): T[] {
  return [...rows].sort((left, right) => {
    if (left.task_id !== right.task_id) {
      return String(left.task_id).localeCompare(String(right.task_id));
    }

    const leftOrder = left.sort_order ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = right.sort_order ?? Number.MAX_SAFE_INTEGER;
    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }

    return String(left.id).localeCompare(String(right.id));
  });
}

export function isChecklistChecked(value: unknown): boolean {
  return value === true || value === 1 || value === "1";
}

export function getChecklistPathMap(
  rows: Array<Pick<ChecklistRow, "id" | "parent_id" | "sort_order">>
): Map<string, string> {
  const sortedRows = [...rows].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
  );
  const parents = sortedRows.filter(row => row.parent_id == null);
  const childrenByParent = new Map<string, Array<Pick<ChecklistRow, "id" | "parent_id" | "sort_order">>>();

  for (const row of sortedRows) {
    if (row.parent_id == null) continue;
    const siblings = childrenByParent.get(row.parent_id) ?? [];
    siblings.push(row);
    childrenByParent.set(row.parent_id, siblings);
  }

  const pathMap = new Map<string, string>();

  parents.forEach((parent, parentIndex) => {
    const parentPath = `${parentIndex + 1}`;
    pathMap.set(parent.id, parentPath);

    const children = childrenByParent.get(parent.id) ?? [];
    children
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
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
  const parentIdsWithChildren = new Set<string>();
  for (const row of rows) {
    if (row.parent_id != null) parentIdsWithChildren.add(row.parent_id);
  }

  const countableRows = rows.filter(row => !parentIdsWithChildren.has(row.id));
  const total = countableRows.length;
  const checked = countableRows.filter(row => isChecklistChecked(row.is_checked)).length;
  const progress = total > 0 ? Math.round((checked / total) * 100) : 0;
  const status: ChecklistTaskStatus =
    currentStatus === "cancelled"
      ? "cancelled"
      : progress >= 100
        ? "completed"
        : progress > 0
          ? "in_progress"
          : "pending";

  return { hasChecklist: rows.length > 0, total, checked, progress, status };
}

export async function getChecklistRowsByTaskIds(taskIds: string[]): Promise<ChecklistRow[]> {
  if (taskIds.length === 0) return [];

  // Firestore "in" query supports max 30 items — batch if needed
  const CHUNK = 30;
  const chunks: string[][] = [];
  for (let i = 0; i < taskIds.length; i += CHUNK) {
    chunks.push(taskIds.slice(i, i + CHUNK));
  }

  const results = await Promise.all(
    chunks.map(chunk =>
      db.collection("task_checklists")
        .where("task_id", "in", chunk)
        .get()
    )
  );

  return sortChecklistRows(results.flatMap(snap =>
    snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChecklistRow))
  ));
}

export async function getChecklistRowsWithUsers(
  taskId: string
): Promise<Array<ChecklistRow & { checked_by_name: string | null }>> {
  const snap = await db
    .collection("task_checklists")
    .where("task_id", "==", taskId)
    .get();

  const rows = sortChecklistRows(
    snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChecklistRow))
  );

  const checkedByIds = [...new Set(rows.map(r => r.checked_by).filter(Boolean))] as string[];
  const userMap = new Map<string, string>();
  if (checkedByIds.length > 0) {
    const userDocs = await Promise.all(checkedByIds.map(id => db.collection("users").doc(id).get()));
    for (const doc of userDocs) {
      if (doc.exists) {
        const d = doc.data()!;
        userMap.set(doc.id, `${d.first_name ?? ""} ${d.last_name ?? ""}`.trim() || "");
      }
    }
  }

  return rows.map(row => ({
    ...row,
    checked_by_name: row.checked_by ? (userMap.get(row.checked_by) ?? null) : null,
  }));
}
