import { Request, Response, NextFunction } from "express";
import { db } from "../config/firebase-admin.js";
import { createNotification } from "../database/queries/notification.queries.js";
import {
  getChecklistPathMap,
  getChecklistRowsByTaskIds,
  getChecklistRowsWithUsers,
  isChecklistChecked,
  summarizeChecklistRows,
} from "../database/queries/checklist.queries.js";
import { createAuditLog } from "../utils/auditLogger.js";
import { ensureTaskAccess } from "../utils/taskAccess.js";

/** GET /api/tasks/:id/updates */
export async function getTaskUpdates(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const taskId = req.params.id;
    const access = await ensureTaskAccess(req.user, taskId);
    if (!access.ok) {
      res.status(access.status ?? 403).json({ error: access.error ?? "คุณไม่มีสิทธิ์เข้าถึงงานนี้" });
      return;
    }

    const snap = await db
      .collection("task_updates")
      .where("task_id", "==", taskId)
      .get();

    const updates = snap.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((left: any, right: any) => String(right.created_at ?? "").localeCompare(String(left.created_at ?? "")));

    const userIds = [...new Set(updates.map((u: any) => u.user_id).filter(Boolean))];
    const userMap = new Map<string, { first_name: string; last_name: string }>();
    if (userIds.length > 0) {
      const userDocs = await Promise.all((userIds as string[]).map(id => db.collection("users").doc(id).get()));
      for (const doc of userDocs) {
        if (doc.exists) userMap.set(doc.id, { first_name: doc.data()?.first_name ?? "", last_name: doc.data()?.last_name ?? "" });
      }
    }

    res.json(updates.map((row: any) => ({
      ...row,
      first_name: userMap.get(row.user_id)?.first_name ?? "",
      last_name: userMap.get(row.user_id)?.last_name ?? "",
    })));
  } catch (err) { next(err); }
}

/** POST /api/tasks/:id/updates */
export async function addTaskUpdate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const taskId = req.params.id;
    const { update_text, progress, attachment_url } = req.body;
    const access = await ensureTaskAccess(req.user, taskId);

    if (!access.ok || !access.task) {
      res.status(access.status ?? 403).json({ error: access.error ?? "คุณไม่มีสิทธิ์อัปเดตงานนี้" });
      return;
    }

    if (!req.user) { res.status(401).json({ error: "กรุณาเข้าสู่ระบบก่อน" }); return; }

    if (!update_text || String(update_text).trim() === "") {
      res.status(400).json({ error: "กรุณาระบุรายละเอียดความคืบหน้า" });
      return;
    }

    const numericProgress = Number(progress ?? 0);
    const newStatus = numericProgress >= 100 ? "completed" : "in_progress";

    await db.collection("task_updates").add({
      task_id: taskId,
      user_id: req.user.id,
      update_text,
      progress: numericProgress,
      attachment_url: attachment_url || null,
      created_at: new Date().toISOString(),
    });

    const taskRef = db.collection("tasks").doc(taskId);
    await taskRef.update({ progress: numericProgress, status: newStatus, updated_at: new Date().toISOString() });
    const taskSnap = await taskRef.get();
    const taskData = taskSnap.data()!;
    const message = `งาน "${taskData.title}" มีการอัปเดตความคืบหน้า (${numericProgress}%)`;

    if (taskData.created_by !== req.user.id) {
      await createNotification(taskData.created_by, "อัปเดตงาน", message, "task_updated", taskId);
    }

    const assignees: string[] = taskData.assignees ?? [];
    for (const uid of assignees) {
      if (uid !== req.user.id) {
        await createNotification(uid, "อัปเดตงาน", message, "task_updated", taskId);
      }
    }

    await createAuditLog(taskId, req.user.id, "PROGRESS_UPDATE",
      { progress: access.task.progress, status: access.task.status },
      { progress: numericProgress, status: newStatus, update_text: String(update_text).trim(), attachment_url: attachment_url || null }
    );

    res.json({ success: true });
  } catch (err) { next(err); }
}

/** GET /api/tasks/:id/checklists */
export async function getChecklists(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const taskId = req.params.id;
    const access = await ensureTaskAccess(req.user, taskId);
    if (!access.ok) {
      res.status(access.status ?? 403).json({ error: access.error ?? "คุณไม่มีสิทธิ์เข้าถึงงานนี้" });
      return;
    }
    res.json(await getChecklistRowsWithUsers(taskId));
  } catch (err) { next(err); }
}

/** POST /api/tasks/:id/checklists */
export async function saveChecklists(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const taskId = req.params.id;
    const { items } = req.body;
    const access = await ensureTaskAccess(req.user, taskId);

    if (!access.ok || !access.task) {
      res.status(access.status ?? 403).json({ error: access.error ?? "คุณไม่มีสิทธิ์แก้ไข checklist ของงานนี้" });
      return;
    }
    if (!req.user) { res.status(401).json({ error: "กรุณาเข้าสู่ระบบก่อน" }); return; }

    const incomingItems = Array.isArray(items) ? items : [];
    type ExistingChecklistRow = {
      id: string;
      ref: FirebaseFirestore.DocumentReference;
      parent_id: string | null;
      checked_at: string | null;
      checked_by: string | null;
    };

    // Get existing checklist rows
    const existingSnap = await db.collection("task_checklists").where("task_id", "==", taskId).get();
    const existingById = new Map<string, ExistingChecklistRow>(
      existingSnap.docs.map((doc) => {
        const data = doc.data() as Partial<ExistingChecklistRow>;
        return [doc.id, {
          id: doc.id,
          ref: doc.ref,
          parent_id: data.parent_id ?? null,
          checked_at: data.checked_at ?? null,
          checked_by: data.checked_by ?? null,
        }];
      })
    );
    const keptIds = new Set<string>();

    for (const [parentIndex, rawItem] of incomingItems.entries()) {
      const item = rawItem ?? {};
      const children = Array.isArray(item.children) ? item.children : [];
      const parentSortOrder = Number.isFinite(Number(item.sort_order)) ? Number(item.sort_order) : parentIndex;
      const parentHasChildren = children.length > 0;
      const parentChecked = parentHasChildren
        ? children.every((child: any) => Boolean(child?.is_checked))
        : Boolean(item.is_checked);
      const existingParent = item.id ? existingById.get(item.id) : null;
      const parentCheckedAt = parentChecked ? (item.checked_at ?? existingParent?.checked_at ?? new Date().toISOString()) : null;
      const parentCheckedBy = parentChecked ? (item.checked_by ?? existingParent?.checked_by ?? req.user.id) : null;

      const parentPayload = {
        task_id: taskId,
        parent_id: null,
        title: String(item.title ?? ""),
        is_checked: parentChecked ? 1 : 0,
        sort_order: parentSortOrder,
        checked_by: parentHasChildren ? null : parentCheckedBy,
        checked_at: parentHasChildren ? null : parentCheckedAt,
      };

      let parentId: string;

      if (existingParent && existingParent.parent_id == null) {
        await existingParent.ref.update(parentPayload);
        parentId = item.id;
      } else {
        const ref = db.collection("task_checklists").doc();
        await ref.set(parentPayload);
        parentId = ref.id;
      }

      keptIds.add(parentId);

      for (const [childIndex, rawChild] of children.entries()) {
        const child = rawChild ?? {};
        const childSortOrder = Number.isFinite(Number(child.sort_order)) ? Number(child.sort_order) : childIndex;
        const childChecked = Boolean(child.is_checked);
        const existingChild = child.id ? existingById.get(child.id) : null;
        const childCheckedAt = childChecked ? (child.checked_at ?? existingChild?.checked_at ?? new Date().toISOString()) : null;
        const childCheckedBy = childChecked ? (child.checked_by ?? existingChild?.checked_by ?? req.user.id) : null;
        const childPayload = {
          task_id: taskId,
          parent_id: parentId,
          title: String(child.title ?? ""),
          is_checked: childChecked ? 1 : 0,
          sort_order: childSortOrder,
          checked_by: childCheckedBy,
          checked_at: childCheckedAt,
        };

        let childId: string;

        if (existingChild && existingChild.parent_id != null) {
          await existingChild.ref.update(childPayload);
          childId = child.id;
        } else {
          const ref = db.collection("task_checklists").doc();
          await ref.set(childPayload);
          childId = ref.id;
        }

        keptIds.add(childId);
      }
    }

    // Delete removed items
    const batch = db.batch();
    for (const [id, row] of existingById) {
      if (!keptIds.has(id)) batch.delete(row.ref);
    }
    await batch.commit();

    const persistedRows = await getChecklistRowsByTaskIds([taskId]);
    const summary = summarizeChecklistRows(persistedRows, access.task.status);
    const nextProgress = summary.hasChecklist ? summary.progress : access.task.progress;
    const nextStatus = summary.hasChecklist ? summary.status : access.task.status;

    await db.collection("tasks").doc(taskId).update({ progress: nextProgress, status: nextStatus, updated_at: new Date().toISOString() });

    await createAuditLog(taskId, req.user.id, "CHECKLIST_UPDATE",
      { progress: access.task.progress, status: access.task.status },
      { progress: nextProgress, status: nextStatus, items_count: incomingItems.length, checkable_count: summary.total }
    );

    res.json({ success: true, progress: nextProgress });
  } catch (err) { next(err); }
}

/** PATCH /api/tasks/:id/checklists/:checklistId/toggle */
export async function toggleChecklist(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const taskId = req.params.id;
    const checklistId = req.params.checklistId;
    const access = await ensureTaskAccess(req.user, taskId);

    if (!access.ok || !access.task) {
      res.status(access.status ?? 403).json({ error: access.error ?? "คุณไม่มีสิทธิ์แก้ไข checklist ของงานนี้" });
      return;
    }
    if (!req.user) { res.status(401).json({ error: "กรุณาเข้าสู่ระบบก่อน" }); return; }

    const checklistRows = await getChecklistRowsByTaskIds([taskId]);
    const current = checklistRows.find(row => row.id === checklistId);

    if (!current) { res.status(404).json({ error: "ไม่พบ checklist ที่ต้องการ" }); return; }

    const hasChildren = checklistRows.some(row => row.parent_id === checklistId);
    if (hasChildren) { res.status(400).json({ error: "หัวข้อหลักจะอัปเดตอัตโนมัติจากหัวข้อย่อย" }); return; }

    const nextChecked = !isChecklistChecked(current.is_checked);
    const checkedAt = nextChecked ? new Date().toISOString() : null;
    const checkedBy = nextChecked ? req.user.id : null;

    await db.collection("task_checklists").doc(checklistId).update({
      is_checked: nextChecked ? 1 : 0,
      checked_by: checkedBy,
      checked_at: checkedAt,
    });

    const refreshedRows = await getChecklistRowsByTaskIds([taskId]);
    const summary = summarizeChecklistRows(refreshedRows, access.task.status);

    await db.collection("tasks").doc(taskId).update({
      progress: summary.progress,
      status: summary.status,
      updated_at: new Date().toISOString(),
    });

    const itemPath = getChecklistPathMap(refreshedRows).get(checklistId) ?? checklistId;
    const itemTitle = String(current.title ?? "").trim();
    const displayLabel = itemTitle ? `${itemPath} ${itemTitle}` : itemPath;
    const actorName = `${req.user.first_name ?? ""} ${req.user.last_name ?? ""}`.trim() || req.user.username || "ผู้ใช้ในระบบ";

    await createAuditLog(taskId, req.user.id, "CHECKLIST_TOGGLE",
      { checklist_id: checklistId, display_label: displayLabel, is_checked: isChecklistChecked(current.is_checked) },
      { checklist_id: checklistId, item_code: itemPath, title: itemTitle, display_label: displayLabel, is_checked: nextChecked, checked_by: checkedBy, checked_by_name: nextChecked ? actorName : null, checked_at: checkedAt, progress: summary.progress, status: summary.status }
    );

    res.json({ success: true, progress: summary.progress, status: summary.status });
  } catch (err) { next(err); }
}
