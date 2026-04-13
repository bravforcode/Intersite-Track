import { Request, Response, NextFunction } from "express";
import * as timeEntryQueries from "../database/queries/timeEntry.queries.js";
import { ensureTaskAccess } from "../utils/taskAccess.js";

async function ensureAccessibleTask(
  req: Request,
  res: Response,
  taskId: string
): Promise<boolean> {
  const access = await ensureTaskAccess(req.user, taskId);
  if (!access.ok) {
    res.status(access.status ?? 403).json({ error: access.error ?? "คุณไม่มีสิทธิ์เข้าถึงงานนี้" });
    return false;
  }
  return true;
}

/** GET /api/time-entries/:taskId — list all entries for a task */
export async function getTaskTimeEntries(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { taskId } = req.params;
    if (!(await ensureAccessibleTask(req, res, taskId))) return;
    const entries = await timeEntryQueries.findTimeEntriesByTaskId(taskId);
    const totalMinutes = entries.reduce((sum, e) => sum + (e.duration_minutes ?? 0), 0);
    res.json({ entries, total_minutes: totalMinutes });
  } catch (err) { next(err); }
}

/** POST /api/time-entries/:taskId/start — start a live timer */
export async function startTimer(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { taskId } = req.params;
    if (!(await ensureAccessibleTask(req, res, taskId))) return;
    const userId = String(req.user!.id);
    const userName = `${req.user!.first_name ?? ""} ${req.user!.last_name ?? ""}`.trim() || undefined;
    const { description } = req.body;

    // Check if user already has a running timer
    const running = await timeEntryQueries.findRunningEntry(userId);
    if (running) {
      res.status(409).json({
        error: "คุณมี timer ที่กำลังทำงานอยู่แล้ว กรุณาหยุดก่อน",
        running_entry_id: running.id,
        running_task_id: running.task_id,
      });
      return;
    }

    const entry = await timeEntryQueries.startTimeEntry(taskId, userId, userName, description);
    res.status(201).json(entry);
  } catch (err) { next(err); }
}

/** PATCH /api/time-entries/:id/stop — stop a running timer */
export async function stopTimer(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const existingEntry = await timeEntryQueries.findTimeEntryById(id);
    if (!existingEntry) {
      res.status(404).json({ error: "Time entry not found" });
      return;
    }

    // SECURITY: Verify user can access the task this entry belongs to
    if (!(await ensureAccessibleTask(req, res, existingEntry.task_id))) return;

    // Also verify ownership (staff can only stop their own, admin can stop anyone's)
    if (req.user?.role !== "admin" && existingEntry.user_id !== req.user?.id) {
      res.status(403).json({ error: "คุณไม่มีสิทธิ์แก้ไข time entry นี้" });
      return;
    }

    const stoppedEntry = await timeEntryQueries.stopTimeEntry(id);
    res.json(stoppedEntry);
  } catch (err: unknown) {
    if (err instanceof Error && (err.message === "Timer is already stopped" || err.message === "Time entry not found")) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
}

/** POST /api/time-entries/:taskId/manual — log hours manually */
export async function logManualEntry(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { taskId } = req.params;
    if (!(await ensureAccessibleTask(req, res, taskId))) return;
    const userId = String(req.user!.id);
    const userName = `${req.user!.first_name ?? ""} ${req.user!.last_name ?? ""}`.trim() || undefined;
    const { duration_minutes, description, started_at } = req.body;

    if (!duration_minutes || typeof duration_minutes !== "number" || duration_minutes <= 0) {
      res.status(400).json({ error: "duration_minutes ต้องเป็นตัวเลขบวก" });
      return;
    }

    const entry = await timeEntryQueries.createManualEntry(
      taskId, userId, duration_minutes, description, userName, started_at
    );
    res.status(201).json(entry);
  } catch (err) { next(err); }
}

/** DELETE /api/time-entries/:id — delete an entry */
export async function deleteEntry(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const existingEntry = await timeEntryQueries.findTimeEntryById(id);
    if (!existingEntry) {
      res.status(404).json({ error: "Time entry not found" });
      return;
    }

    // SECURITY: Verify user can access the task this entry belongs to
    if (!(await ensureAccessibleTask(req, res, existingEntry.task_id))) return;

    // Also verify ownership (staff can only delete their own, admin can delete anyone's)
    if (req.user?.role !== "admin" && existingEntry.user_id !== req.user?.id) {
      res.status(403).json({ error: "คุณไม่มีสิทธิ์ลบ time entry นี้" });
      return;
    }

    await timeEntryQueries.deleteTimeEntry(id);
    res.json({ success: true });
  } catch (err) { next(err); }
}

/** GET /api/time-entries/:taskId/running — check if current user has a running timer for this task */
export async function getRunningEntry(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = String(req.user!.id);
    const running = await timeEntryQueries.findRunningEntry(userId);
    res.json({ running_entry: running ?? null });
  } catch (err) { next(err); }
}
