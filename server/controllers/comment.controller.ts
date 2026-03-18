import { Request, Response, NextFunction } from "express";
import { getCommentsByTaskId, createComment } from "../database/queries/comment.queries.js";

export async function getTaskComments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const taskId = Number(req.params.id);
    const comments = await getCommentsByTaskId(taskId);
    res.json(comments);
  } catch (err) { next(err); }
}

export async function addTaskComment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const taskId = Number(req.params.id);
    const userId = req.user?.id;
    const { message } = req.body;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    if (!message || message.trim() === "") {
      res.status(400).json({ error: "Message cannot be empty" });
      return;
    }

    const comment = await createComment(taskId, userId, message);
    
    // We return the newly created comment, maybe with user_name fetched, but front-end can append mostly
    res.status(201).json(comment);
  } catch (err) { next(err); }
}
