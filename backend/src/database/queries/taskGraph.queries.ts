import { db } from "../../config/firebase-admin.js";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface TaskLink {
  id: string;
  from_task_id: string; // task ที่ต้องเสร็จก่อน
  to_task_id: string;   // task ที่รอ
  link_type: "finish_to_start" | "blocks";
  created_at: string;
  created_by: string;
}

export interface SubtaskRef {
  id: string;
  parent_task_id: string;
  child_task_id: string;
  order: number;
  created_at: string;
}

// ─── Adjacency helpers ─────────────────────────────────────────────────────────

/** Build adjacency list of all task_links (direction: from → to) */
async function buildAdjacencyList(): Promise<Map<string, string[]>> {
  const snap = await db.collection("task_links").get();
  const map = new Map<string, string[]>();
  for (const doc of snap.docs) {
    const d = doc.data();
    const from = d.from_task_id as string;
    const to = d.to_task_id as string;
    if (!map.has(from)) map.set(from, []);
    map.get(from)!.push(to);
  }
  return map;
}

// ─── DAG Cycle Detection (Iterative DFS) ──────────────────────────────────────

/**
 * Returns true if adding edge from→to would create a cycle.
 * Uses iterative DFS from `to` — if we can reach `from`, that's a cycle.
 */
async function wouldCreateCycle(
  from: string,
  to: string
): Promise<boolean> {
  const adj = await buildAdjacencyList();

  // Temporarily apply the new edge
  if (!adj.has(from)) adj.set(from, []);
  adj.get(from)!.push(to);

  // DFS from `to` — can we reach `from`?
  const visited = new Set<string>();
  const stack = [to];

  while (stack.length > 0) {
    const node = stack.pop()!;
    if (node === from) return true; // Cycle detected
    if (visited.has(node)) continue;
    visited.add(node);
    for (const neighbor of adj.get(node) ?? []) {
      stack.push(neighbor);
    }
  }
  return false;
}

// ─── Task Links (Dependencies) ────────────────────────────────────────────────

export async function findLinksByTask(taskId: string): Promise<TaskLink[]> {
  const [fromSnap, toSnap] = await Promise.all([
    db.collection("task_links").where("from_task_id", "==", taskId).get(),
    db.collection("task_links").where("to_task_id", "==", taskId).get(),
  ]);
  const docs = [...fromSnap.docs, ...toSnap.docs];
  return docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<TaskLink, "id">),
  }));
}

export async function createTaskLink(
  from_task_id: string,
  to_task_id: string,
  link_type: TaskLink["link_type"],
  created_by: string
): Promise<string> {
  if (from_task_id === to_task_id) {
    throw new Error("A task cannot depend on itself.");
  }

  // Guard: existing link
  const existingSnap = await db
    .collection("task_links")
    .where("from_task_id", "==", from_task_id)
    .where("to_task_id", "==", to_task_id)
    .limit(1)
    .get();
  if (!existingSnap.empty) {
    throw new Error("Dependency link already exists.");
  }

  // Guard: cycle detection
  const hasCycle = await wouldCreateCycle(from_task_id, to_task_id);
  if (hasCycle) {
    throw new Error("Adding this dependency would create a circular dependency (cycle).");
  }

  const ref = db.collection("task_links").doc();
  await ref.set({
    from_task_id,
    to_task_id,
    link_type,
    created_by,
    created_at: new Date().toISOString(),
  });
  return ref.id;
}

export async function deleteTaskLink(id: string): Promise<void> {
  await db.collection("task_links").doc(id).delete();
}

// ─── Subtasks ─────────────────────────────────────────────────────────────────

export async function findSubtasks(parentTaskId: string): Promise<SubtaskRef[]> {
  const snap = await db
    .collection("subtask_refs")
    .where("parent_task_id", "==", parentTaskId)
    .orderBy("order", "asc")
    .get();
  return snap.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<SubtaskRef, "id">),
  }));
}

export async function findParentTask(childTaskId: string): Promise<SubtaskRef | null> {
  const snap = await db
    .collection("subtask_refs")
    .where("child_task_id", "==", childTaskId)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0]!;
  return { id: doc.id, ...(doc.data() as Omit<SubtaskRef, "id">) };
}

export async function addSubtask(
  parent_task_id: string,
  child_task_id: string,
  created_by: string
): Promise<void> {
  // Guard: no self-reference
  if (parent_task_id === child_task_id) {
    throw new Error("Task cannot be its own subtask.");
  }

  // Guard: no re-parenting if child already has a parent
  const existingParent = await findParentTask(child_task_id);
  if (existingParent) {
    throw new Error("Task already has a parent. Reparenting is not allowed via this endpoint.");
  }

  // Guard: DAG cycle — would creating parent→child cycle?
  const hasCycle = await wouldCreateCycle(parent_task_id, child_task_id);
  if (hasCycle) {
    throw new Error("Adding this subtask would create a circular hierarchy.");
  }

  // Get current count for ordering
  const existing = await findSubtasks(parent_task_id);
  const ref = db.collection("subtask_refs").doc();
  await ref.set({
    parent_task_id,
    child_task_id,
    order: existing.length,
    created_at: new Date().toISOString(),
    created_by,
  });
}

export async function removeSubtask(subtaskRefId: string): Promise<void> {
  await db.collection("subtask_refs").doc(subtaskRefId).delete();
}

export async function reorderSubtasks(
  parentTaskId: string,
  orderedChildIds: string[]
): Promise<void> {
  const refs = await findSubtasks(parentTaskId);
  const refByChild = new Map(refs.map((r) => [r.child_task_id, r.id]));
  const batch = db.batch();
  orderedChildIds.forEach((childId, idx) => {
    const refId = refByChild.get(childId);
    if (refId) {
      batch.update(db.collection("subtask_refs").doc(refId), { order: idx });
    }
  });
  await batch.commit();
}
