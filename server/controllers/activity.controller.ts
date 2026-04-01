import { Request, Response, NextFunction } from "express";
import { getActivityByTaskId, getAllActivity } from "../database/queries/activity.queries.js";
import { ensureTaskAccess } from "../utils/taskAccess.js";

export async function getTaskActivity(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const taskId = Number(req.params.id);
    const access = await ensureTaskAccess(req.user, taskId);
    if (!access.ok) {
      res.status(access.status ?? 403).json({ error: access.error ?? "คุณไม่มีสิทธิ์เข้าถึงงานนี้" });
      return;
    }

    const activity = await getActivityByTaskId(taskId);
    res.json(activity);
  } catch (err) { next(err); }
}

export async function getGlobalActivity(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (req.user?.role !== "admin") {
      res.status(403).json({ error: "เฉพาะแอดมินเท่านั้นที่สามารถเข้าถึงส่วนนี้ได้" });
      return;
    }

    const limit = Number(req.query.limit) || 50;
    const activity = await getAllActivity(limit);
    res.json(activity);
  } catch (err) { next(err); }
}
