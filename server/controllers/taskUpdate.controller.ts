import { Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "../config/supabase.js";
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
    const taskId = Number(req.params.id);
    const access = await ensureTaskAccess(req.user, taskId);
    if (!access.ok) {
      res.status(access.status ?? 403).json({ error: access.error ?? "คุณไม่มีสิทธิ์เข้าถึงงานนี้" });
      return;
    }

    const { data, error } = await supabaseAdmin
      .from("task_updates")
      .select(`
        id,
        task_id,
        user_id,
        update_text,
        progress,
        attachment_url,
        created_at,
        user:users!task_updates_user_id_fkey(first_name,last_name)
      `)
      .eq("task_id", taskId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json((data ?? []).map((row: any) => ({
      ...row,
      first_name: row.user?.first_name ?? "",
      last_name: row.user?.last_name ?? "",
    })));
  } catch (err) { next(err); }
}

/** POST /api/tasks/:id/updates */
export async function addTaskUpdate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const taskId = Number(req.params.id);
    const { update_text, progress, attachment_url } = req.body;
    const access = await ensureTaskAccess(req.user, taskId);

    if (!access.ok || !access.task) {
      res.status(access.status ?? 403).json({ error: access.error ?? "คุณไม่มีสิทธิ์อัปเดตงานนี้" });
      return;
    }

    if (!req.user) {
      res.status(401).json({ error: "กรุณาเข้าสู่ระบบก่อน" });
      return;
    }

    if (!update_text || String(update_text).trim() === "") {
      res.status(400).json({ error: "กรุณาระบุรายละเอียดความคืบหน้า" });
      return;
    }

    const numericProgress = Number(progress ?? 0);
    const newStatus = numericProgress >= 100 ? "completed" : "in_progress";

    const { error: insertError } = await supabaseAdmin
      .from("task_updates")
      .insert({
        task_id: taskId,
        user_id: req.user.id,
        update_text,
        progress: numericProgress,
        attachment_url: attachment_url || null,
      });

    if (insertError) throw insertError;

    const { data: updatedTask, error: updateError } = await supabaseAdmin
      .from("tasks")
      .update({
        progress: numericProgress,
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", taskId)
      .select("title, created_by")
      .single();

    if (updateError || !updatedTask) throw updateError ?? new Error("Failed to update task progress");

    if (updatedTask.created_by !== req.user.id) {
      await createNotification(
        updatedTask.created_by,
        "อัปเดตงาน",
        `งาน "${updatedTask.title}" มีการอัปเดตความคืบหน้า (${numericProgress}%)`,
        "task_updated",
        taskId
      );
    }

    await createAuditLog(
      taskId,
      req.user.id,
      "PROGRESS_UPDATE",
      { progress: access.task.progress, status: access.task.status },
      { progress: numericProgress, status: newStatus, update_text: String(update_text).trim(), attachment_url: attachment_url || null }
    );

    res.json({ success: true });
  } catch (err) { next(err); }
}

/** GET /api/tasks/:id/checklists */
export async function getChecklists(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const taskId = Number(req.params.id);
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
    const taskId = Number(req.params.id);
    const { items } = req.body;
    const access = await ensureTaskAccess(req.user, taskId);

    if (!access.ok || !access.task) {
      res.status(access.status ?? 403).json({ error: access.error ?? "คุณไม่มีสิทธิ์แก้ไข checklist ของงานนี้" });
      return;
    }

    if (!req.user) {
      res.status(401).json({ error: "กรุณาเข้าสู่ระบบก่อน" });
      return;
    }

    const incomingItems = Array.isArray(items) ? items : [];
    const { data: existingRows, error: existingRowsError } = await supabaseAdmin
      .from("task_checklists")
      .select("id, parent_id, checked_by, checked_at")
      .eq("task_id", taskId);

    if (existingRowsError) throw existingRowsError;

    const existingById = new Map<number, any>((existingRows ?? []).map((row: any) => [row.id, row]));
    const keptIds = new Set<number>();

    for (const [parentIndex, rawItem] of incomingItems.entries()) {
      const item = rawItem ?? {};
      const children = Array.isArray(item.children) ? item.children : [];
      const parentSortOrder = Number.isFinite(Number(item.sort_order)) ? Number(item.sort_order) : parentIndex;
      const parentHasChildren = children.length > 0;
      const parentChecked = parentHasChildren
        ? children.every((child: any) => Boolean(child?.is_checked))
        : Boolean(item.is_checked);
      const existingParent = item.id ? existingById.get(item.id) : null;
      const parentCheckedAt = parentChecked
        ? item.checked_at ?? existingParent?.checked_at ?? new Date().toISOString()
        : null;
      const parentCheckedBy = parentChecked
        ? item.checked_by ?? existingParent?.checked_by ?? req.user.id
        : null;

      const parentPayload = {
        task_id: taskId,
        parent_id: null,
        title: String(item.title ?? ""),
        is_checked: parentChecked ? 1 : 0,
        sort_order: parentSortOrder,
        checked_by: parentHasChildren ? null : parentCheckedBy,
        checked_at: parentHasChildren ? null : parentCheckedAt,
      };

      let parentId = Number(item.id);

      if (existingParent && existingParent.parent_id == null) {
        const { data: updatedParent, error: updateParentError } = await supabaseAdmin
          .from("task_checklists")
          .update(parentPayload)
          .eq("id", parentId)
          .eq("task_id", taskId)
          .select("id")
          .single();

        if (updateParentError || !updatedParent) {
          throw updateParentError ?? new Error("Failed to update checklist parent");
        }

        parentId = updatedParent.id;
      } else {
        const { data: insertedParent, error: insertParentError } = await supabaseAdmin
          .from("task_checklists")
          .insert(parentPayload)
          .select("id")
          .single();

        if (insertParentError || !insertedParent) {
          throw insertParentError ?? new Error("Failed to create checklist parent");
        }

        parentId = insertedParent.id;
      }

      keptIds.add(parentId);

      for (const [childIndex, rawChild] of children.entries()) {
        const child = rawChild ?? {};
        const childSortOrder = Number.isFinite(Number(child.sort_order)) ? Number(child.sort_order) : childIndex;
        const childChecked = Boolean(child.is_checked);
        const existingChild = child.id ? existingById.get(child.id) : null;
        const childCheckedAt = childChecked
          ? child.checked_at ?? existingChild?.checked_at ?? new Date().toISOString()
          : null;
        const childCheckedBy = childChecked
          ? child.checked_by ?? existingChild?.checked_by ?? req.user.id
          : null;
        const childPayload = {
          task_id: taskId,
          parent_id: parentId,
          title: String(child.title ?? ""),
          is_checked: childChecked ? 1 : 0,
          sort_order: childSortOrder,
          checked_by: childCheckedBy,
          checked_at: childCheckedAt,
        };

        let childId = Number(child.id);

        if (existingChild && existingChild.parent_id != null) {
          const { data: updatedChild, error: updateChildError } = await supabaseAdmin
            .from("task_checklists")
            .update(childPayload)
            .eq("id", childId)
            .eq("task_id", taskId)
            .select("id")
            .single();

          if (updateChildError || !updatedChild) {
            throw updateChildError ?? new Error("Failed to update checklist child");
          }

          childId = updatedChild.id;
        } else {
          const { data: insertedChild, error: insertChildError } = await supabaseAdmin
            .from("task_checklists")
            .insert(childPayload)
            .select("id")
            .single();

          if (insertChildError || !insertedChild) {
            throw insertChildError ?? new Error("Failed to create checklist child");
          }

          childId = insertedChild.id;
        }

        keptIds.add(childId);
      }
    }

    const removedIds = (existingRows ?? [])
      .map((row: any) => row.id)
      .filter((id: number) => !keptIds.has(id));

    if (removedIds.length > 0) {
      const { error: deleteError } = await supabaseAdmin
        .from("task_checklists")
        .delete()
        .in("id", removedIds)
        .eq("task_id", taskId);

      if (deleteError) throw deleteError;
    }

    const persistedRows = await getChecklistRowsByTaskIds([taskId]);
    const summary = summarizeChecklistRows(persistedRows, access.task.status);
    const nextProgress = summary.hasChecklist ? summary.progress : access.task.progress;
    const nextStatus = summary.hasChecklist ? summary.status : access.task.status;

    const { error: taskError } = await supabaseAdmin
      .from("tasks")
      .update({
        progress: nextProgress,
        status: nextStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", taskId);

    if (taskError) throw taskError;

    await createAuditLog(
      taskId,
      req.user.id,
      "CHECKLIST_UPDATE",
      { progress: access.task.progress, status: access.task.status },
      {
        progress: nextProgress,
        status: nextStatus,
        items_count: incomingItems.length,
        checkable_count: summary.total,
      }
    );

    res.json({ success: true, progress: nextProgress });
  } catch (err) { next(err); }
}

/** PATCH /api/tasks/:id/checklists/:checklistId/toggle */
export async function toggleChecklist(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const taskId = Number(req.params.id);
    const checklistId = Number(req.params.checklistId);
    const access = await ensureTaskAccess(req.user, taskId);

    if (!access.ok || !access.task) {
      res.status(access.status ?? 403).json({ error: access.error ?? "คุณไม่มีสิทธิ์แก้ไข checklist ของงานนี้" });
      return;
    }

    if (!req.user) {
      res.status(401).json({ error: "กรุณาเข้าสู่ระบบก่อน" });
      return;
    }

    const checklistRows = await getChecklistRowsByTaskIds([taskId]);
    const current = checklistRows.find((row) => row.id === checklistId);

    if (!current) {
      res.status(404).json({ error: "ไม่พบ checklist ที่ต้องการ" });
      return;
    }

    const hasChildren = checklistRows.some((row) => row.parent_id === checklistId);
    if (hasChildren) {
      res.status(400).json({ error: "หัวข้อหลักจะอัปเดตอัตโนมัติจากหัวข้อย่อย" });
      return;
    }

    const nextChecked = !isChecklistChecked(current.is_checked);
    const checkedAt = nextChecked ? new Date().toISOString() : null;
    const checkedBy = nextChecked ? req.user.id : null;

    const { error: updateError } = await supabaseAdmin
      .from("task_checklists")
      .update({
        is_checked: nextChecked ? 1 : 0,
        checked_by: checkedBy,
        checked_at: checkedAt,
      })
      .eq("id", checklistId)
      .eq("task_id", taskId);

    if (updateError) throw updateError;

    const refreshedRows = await getChecklistRowsByTaskIds([taskId]);
    const summary = summarizeChecklistRows(refreshedRows, access.task.status);

    const { error: taskError } = await supabaseAdmin
      .from("tasks")
      .update({
        progress: summary.progress,
        status: summary.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", taskId);

    if (taskError) throw taskError;

    const itemPath = getChecklistPathMap(refreshedRows).get(checklistId) ?? `${checklistId}`;
    const itemTitle = String(current.title ?? "").trim();
    const displayLabel = itemTitle ? `${itemPath} ${itemTitle}` : itemPath;
    const actorName =
      `${req.user.first_name ?? ""} ${req.user.last_name ?? ""}`.trim() ||
      req.user.username ||
      "ผู้ใช้ในระบบ";

    await createAuditLog(
      taskId,
      req.user.id,
      "CHECKLIST_TOGGLE",
      {
        checklist_id: checklistId,
        display_label: displayLabel,
        is_checked: isChecklistChecked(current.is_checked),
      },
      {
        checklist_id: checklistId,
        item_code: itemPath,
        title: itemTitle,
        display_label: displayLabel,
        is_checked: nextChecked,
        checked_by: checkedBy,
        checked_by_name: nextChecked ? actorName : null,
        checked_at: checkedAt,
        progress: summary.progress,
        status: summary.status,
      }
    );

    res.json({ success: true, progress: summary.progress, status: summary.status });
  } catch (err) { next(err); }
}
