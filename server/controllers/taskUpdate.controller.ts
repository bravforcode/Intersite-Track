import { Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "../config/supabase.js";
import { createNotification } from "../database/queries/notification.queries.js";
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

    const { data, error } = await supabaseAdmin
      .from("task_checklists")
      .select("*")
      .eq("task_id", taskId)
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true });

    if (error) throw error;
    res.json(data ?? []);
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

    const { error: deleteError } = await supabaseAdmin
      .from("task_checklists")
      .delete()
      .eq("task_id", taskId);

    if (deleteError) throw deleteError;

    for (const item of items ?? []) {
      const { data: parent, error: parentError } = await supabaseAdmin
        .from("task_checklists")
        .insert({
          task_id: taskId,
          parent_id: null,
          title: item.title,
          is_checked: item.is_checked ? 1 : 0,
          sort_order: item.sort_order || 0,
        })
        .select("id")
        .single();

      if (parentError || !parent) throw parentError ?? new Error("Failed to save checklist");

      for (const child of item.children ?? []) {
        const { error: childError } = await supabaseAdmin
          .from("task_checklists")
          .insert({
            task_id: taskId,
            parent_id: parent.id,
            title: child.title,
            is_checked: child.is_checked ? 1 : 0,
            sort_order: child.sort_order || 0,
          });

        if (childError) throw childError;
      }
    }

    const { data: allItems, error: allItemsError } = await supabaseAdmin
      .from("task_checklists")
      .select("is_checked")
      .eq("task_id", taskId);

    if (allItemsError) throw allItemsError;

    const total = allItems?.length ?? 0;
    const checked = (allItems ?? []).filter((row: any) => row.is_checked === 1).length;
    const pct = total > 0 ? Math.round((checked / total) * 100) : 0;
    const newStatus = pct >= 100 ? "completed" : pct > 0 ? "in_progress" : "pending";

    const { error: taskError } = await supabaseAdmin
      .from("tasks")
      .update({
        progress: pct,
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", taskId);

    if (taskError) throw taskError;

    await createAuditLog(
      taskId,
      req.user.id,
      "CHECKLIST_UPDATE",
      { progress: access.task.progress, status: access.task.status },
      { progress: pct, status: newStatus, items_count: Array.isArray(items) ? items.length : 0 }
    );

    res.json({ success: true, progress: pct });
  } catch (err) { next(err); }
}

/** PATCH /api/checklists/:id/toggle */
export async function toggleChecklist(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const checklistId = Number(req.params.id);

    const { data: current, error: readError } = await supabaseAdmin
      .from("task_checklists")
      .select("is_checked")
      .eq("id", checklistId)
      .single();

    if (readError || !current) throw readError ?? new Error("Checklist not found");

    const { error } = await supabaseAdmin
      .from("task_checklists")
      .update({ is_checked: current.is_checked === 1 ? 0 : 1 })
      .eq("id", checklistId);

    if (error) throw error;

    res.json({ success: true });
  } catch (err) { next(err); }
}
