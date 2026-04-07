import { Request, Response, NextFunction } from "express";
import { getCommentsByTaskId, createComment } from "../database/queries/comment.queries.js";
import { createAuditLog } from "../utils/auditLogger.js";
import { ensureTaskAccess } from "../utils/taskAccess.js";

export async function getTaskComments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const taskId = req.params.id;
    const access = await ensureTaskAccess(req.user, taskId);
    if (!access.ok) {
      res.status(access.status ?? 403).json({ error: access.error ?? "คุณไม่มีสิทธิ์เข้าถึงงานนี้" });
      return;
    }

    const comments = await getCommentsByTaskId(taskId);
    res.json(comments);
  } catch (err) { next(err); }
}

export async function addTaskComment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const taskId = req.params.id;
    const userId = req.user?.id;
    const message = String(req.body?.message ?? "").trim();
    const access = await ensureTaskAccess(req.user, taskId);

    if (!access.ok) {
      res.status(access.status ?? 403).json({ error: access.error ?? "คุณไม่มีสิทธิ์แสดงความคิดเห็นในงานนี้" });
      return;
    }

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    if (!message) {
      res.status(400).json({ error: "Message cannot be empty" });
      return;
    }

    const comment = await createComment(taskId, userId, message);
    await createAuditLog(taskId, userId, "COMMENT", null, { message });

    res.status(201).json(comment);
  } catch (err) { next(err); }
}
