import { Request, Response, NextFunction } from "express";
import { getActivityByTaskId } from "../database/queries/activity.queries.js";

export async function getTaskActivity(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const taskId = Number(req.params.id);
    const activity = await getActivityByTaskId(taskId);
    res.json(activity);
  } catch (err) { next(err); }
}
