import { Request, Response, NextFunction } from "express";
import { query, transaction } from "../database/connection.js";
import { createNotification } from "../database/queries/notification.queries.js";
import { createAuditLog } from "../utils/auditLogger.js";
import { ensureTaskAccess } from "../utils/taskAccess.js";

/** GET /api/tasks/:id/updates */
export async function getTaskUpdates(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const access = await ensureTaskAccess(req.user, Number(req.params.id));
    if (!access.ok) {
      res.status(access.status ?? 403).json({ error: access.error ?? "คุณไม่มีสิทธิ์เข้าถึงงานนี้" });
      return;
    }

    const result = await query(
      `SELECT tu.*, u.first_name, u.last_name
       FROM task_updates tu JOIN users u ON tu.user_id = u.id
       WHERE tu.task_id = $1 ORDER BY tu.created_at DESC`,
      [req.params.id]
    );
    res.json(result.rows);
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

    await transaction(async (client) => {
      await client.query(
        "INSERT INTO task_updates (task_id, user_id, update_text, progress, attachment_url) VALUES ($1,$2,$3,$4,$5)",
        [taskId, req.user!.id, update_text, progress, attachment_url || null]
      );
      const newStatus = progress >= 100 ? "completed" : "in_progress";
      await client.query(
        "UPDATE tasks SET progress=$1, status=$2, updated_at=CURRENT_TIMESTAMP WHERE id=$3",
        [progress, newStatus, taskId]
      );
      const taskResult = await client.query("SELECT title, created_by FROM tasks WHERE id=$1", [taskId]);
      const task = taskResult.rows[0];
      if (task.created_by !== req.user!.id) {
        await createNotification(
          task.created_by, "อัปเดตงาน",
          `งาน "${task.title}" มีการอัปเดตความคืบหน้า (${progress}%)`,
          "task_updated", taskId
        );
      }

      await createAuditLog(
        taskId,
        req.user!.id,
        "PROGRESS_UPDATE",
        { progress: access.task!.progress, status: access.task!.status },
        { progress, status: newStatus, update_text: String(update_text).trim(), attachment_url: attachment_url || null },
        client
      );
    });
    res.json({ success: true });
  } catch (err) { next(err); }
}

/** GET /api/tasks/:id/checklists */
export async function getChecklists(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const access = await ensureTaskAccess(req.user, Number(req.params.id));
    if (!access.ok) {
      res.status(access.status ?? 403).json({ error: access.error ?? "คุณไม่มีสิทธิ์เข้าถึงงานนี้" });
      return;
    }

    const result = await query(
      "SELECT * FROM task_checklists WHERE task_id=$1 ORDER BY sort_order, id",
      [req.params.id]
    );
    res.json(result.rows);
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

    const progress = await transaction(async (client) => {
      await client.query("DELETE FROM task_checklists WHERE task_id=$1", [taskId]);
      for (const item of items) {
        const r = await client.query(
          "INSERT INTO task_checklists (task_id, parent_id, title, is_checked, sort_order) VALUES ($1,$2,$3,$4,$5) RETURNING id",
          [taskId, null, item.title, item.is_checked ? 1 : 0, item.sort_order || 0]
        );
        const parentId = r.rows[0].id;
        if (item.children?.length) {
          for (const child of item.children) {
            await client.query(
              "INSERT INTO task_checklists (task_id, parent_id, title, is_checked, sort_order) VALUES ($1,$2,$3,$4,$5)",
              [taskId, parentId, child.title, child.is_checked ? 1 : 0, child.sort_order || 0]
            );
          }
        }
      }
      const allItems = await client.query("SELECT is_checked FROM task_checklists WHERE task_id=$1", [taskId]);
      const total = allItems.rows.length;
      const checked = allItems.rows.filter((r: { is_checked: number }) => r.is_checked === 1).length;
      const pct = total > 0 ? Math.round((checked / total) * 100) : 0;
      const newStatus = pct >= 100 ? "completed" : pct > 0 ? "in_progress" : "pending";
      await client.query(
        "UPDATE tasks SET progress=$1, status=$2, updated_at=CURRENT_TIMESTAMP WHERE id=$3",
        [pct, newStatus, taskId]
      );
      await createAuditLog(
        taskId,
        req.user!.id,
        "CHECKLIST_UPDATE",
        { progress: access.task!.progress, status: access.task!.status },
        { progress: pct, status: newStatus, items_count: Array.isArray(items) ? items.length : 0 },
        client
      );
      return pct;
    });
    res.json({ success: true, progress });
  } catch (err) { next(err); }
}

/** PATCH /api/checklists/:id/toggle */
export async function toggleChecklist(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await query(
      "UPDATE task_checklists SET is_checked = CASE WHEN is_checked=0 THEN 1 ELSE 0 END WHERE id=$1",
      [req.params.id]
    );
    res.json({ success: true });
  } catch (err) { next(err); }
}
