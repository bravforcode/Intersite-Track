import { Request, Response, NextFunction } from "express";
import {
  findAllTasks, findTaskById, createTask, updateTask, deleteTask,
  updateTaskStatus, getTaskAssignments, setTaskAssignments, getCurrentAssignments,
} from "../database/queries/task.queries";
import { createNotification } from "../database/queries/notification.queries";
import { transaction } from "../database/connection";

const STATUS_THAI: Record<string, string> = {
  pending: "รอดำเนินการ", in_progress: "กำลังดำเนินการ",
  completed: "เสร็จสิ้น", cancelled: "ยกเลิก",
};

/** GET /api/tasks */
export async function getTasks(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tasks = await findAllTasks(req.query as Record<string, string>);
    for (const task of tasks) {
      task.assignments = await getTaskAssignments(task.id as number);
    }
    res.json(tasks);
  } catch (err) { next(err); }
}

/** GET /api/tasks/:id */
export async function getTask(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const task = await findTaskById(Number(req.params.id));
    if (!task) { res.status(404).json({ error: "ไม่พบงาน" }); return; }
    task.assignments = await getTaskAssignments(task.id as number);
    res.json(task);
  } catch (err) { next(err); }
}

/** POST /api/tasks */
export async function createTaskHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { title, description, task_type_id, priority, due_date, created_by, assigned_user_ids } = req.body;
    if (!title) { res.status(400).json({ error: "กรุณาระบุชื่องาน" }); return; }

    const taskId = await transaction(async (client) => {
      const id = await createTask({ title, description, task_type_id, priority, due_date, created_by });
      if (assigned_user_ids?.length) {
        await setTaskAssignments(client, id, assigned_user_ids);
        for (const uid of assigned_user_ids) {
          await createNotification(uid, "งานใหม่", `คุณได้รับมอบหมายงาน: ${title}`, "task_assigned", id);
        }
      }
      return id;
    });
    res.json({ id: taskId });
  } catch (err) { next(err); }
}

/** PUT /api/tasks/:id */
export async function updateTaskHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const taskId = Number(req.params.id);
    const { title, description, task_type_id, priority, status, due_date, assigned_user_ids } = req.body;

    await transaction(async (client) => {
      await updateTask(taskId, { title, description, task_type_id, priority, status, due_date });
      const currentIds = await getCurrentAssignments(taskId);
      if (assigned_user_ids?.length) {
        await setTaskAssignments(client, taskId, assigned_user_ids);
        for (const uid of assigned_user_ids) {
          if (!currentIds.includes(uid)) {
            await createNotification(uid, "งานใหม่", `คุณได้รับมอบหมายงาน: ${title}`, "task_assigned", taskId);
          }
          await createNotification(uid, "แก้ไขงาน", `งาน "${title}" ได้รับการแก้ไข`, "task_updated", taskId);
        }
      }
    });
    res.json({ success: true });
  } catch (err) { next(err); }
}

/** PATCH /api/tasks/:id/status */
export async function updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const taskId = Number(req.params.id);
    const { status, progress } = req.body;
    await updateTaskStatus(taskId, status, progress ?? 0);

    const task = await findTaskById(taskId);
    const assignments = await getTaskAssignments(taskId);
    for (const a of assignments) {
      await createNotification(
        a.id, "สถานะเปลี่ยน",
        `งาน "${task?.title}" เปลี่ยนสถานะเป็น: ${STATUS_THAI[status] || status}`,
        "status_changed", taskId
      );
    }
    res.json({ success: true });
  } catch (err) { next(err); }
}

/** DELETE /api/tasks/:id */
export async function deleteTaskHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await deleteTask(Number(req.params.id));
    res.json({ success: true });
  } catch (err) { next(err); }
}
