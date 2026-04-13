import { Request, Response, NextFunction } from "express";
import {
  findLinksByTask,
  createTaskLink,
  deleteTaskLink,
  findSubtasks,
  addSubtask,
  removeSubtask,
  reorderSubtasks,
} from "../database/queries/taskGraph.queries.js";
import { findTaskById } from "../database/queries/task.queries.js";

// ─── Task Links (Dependencies) ────────────────────────────────────────────────

export async function getTaskLinks(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const links = await findLinksByTask(req.params.taskId!);
    res.json(links);
  } catch (err) {
    next(err);
  }
}

export async function createLink(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { from_task_id, to_task_id, link_type } = req.body as {
      from_task_id: string;
      to_task_id: string;
      link_type: "finish_to_start" | "blocks";
    };
    if (!from_task_id || !to_task_id) {
      res.status(400).json({ error: "from_task_id and to_task_id are required." });
      return;
    }
    // Verify both tasks exist
    const [from, to] = await Promise.all([
      findTaskById(from_task_id),
      findTaskById(to_task_id),
    ]);
    if (!from || !to) {
      res.status(404).json({ error: "One or both tasks not found." });
      return;
    }
    const id = await createTaskLink(
      from_task_id,
      to_task_id,
      link_type ?? "finish_to_start",
      req.user!.id
    );
    res.status(201).json({ id });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("cycle") || msg.includes("already exists") || msg.includes("itself")) {
      res.status(422).json({ error: msg });
      return;
    }
    next(err);
  }
}

export async function deleteLink(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    await deleteTaskLink(req.params.linkId!);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

// ─── Subtasks ─────────────────────────────────────────────────────────────────

export async function getSubtasks(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const refs = await findSubtasks(req.params.taskId!);
    // Resolve task details for each subtask
    const tasks = await Promise.all(
      refs.map(async (ref) => ({
        ref,
        task: await findTaskById(ref.child_task_id),
      }))
    );
    res.json(tasks.filter((t) => t.task !== null));
  } catch (err) {
    next(err);
  }
}

export async function createSubtask(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { child_task_id } = req.body as { child_task_id: string };
    if (!child_task_id) {
      res.status(400).json({ error: "child_task_id is required." });
      return;
    }
    const child = await findTaskById(child_task_id);
    if (!child) {
      res.status(404).json({ error: "Child task not found." });
      return;
    }
    await addSubtask(req.params.taskId!, child_task_id, req.user!.id);
    res.status(201).json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("cycle") || msg.includes("already") || msg.includes("parent")) {
      res.status(422).json({ error: msg });
      return;
    }
    next(err);
  }
}

export async function deleteSubtask(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    await removeSubtask(req.params.refId!);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function reorderSubtasksHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { ordered_ids } = req.body as { ordered_ids: string[] };
    if (!Array.isArray(ordered_ids)) {
      res.status(400).json({ error: "ordered_ids must be an array." });
      return;
    }
    await reorderSubtasks(req.params.taskId!, ordered_ids);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}
