import { Request, Response, NextFunction } from "express";
import {
  findAllTasks, findTaskById, createTask, updateTask, deleteTask,
  updateTaskStatus, getTaskAssignments, setTaskAssignments, getCurrentAssignments,
} from "../database/queries/task.queries.js";
import { createNotification } from "../database/queries/notification.queries.js";
import { transaction } from "../database/connection.js";
import { createAuditLog } from "../utils/auditLogger.js";

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
      
      await createAuditLog(id, req.user?.id || null, "CREATE", null, { title, description, task_type_id, priority, due_date, assigned_user_ids }, client);
      
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
      const existingTask = await findTaskById(taskId);
      await updateTask(taskId, { title, description, task_type_id, priority, status, due_date });
      
      await createAuditLog(taskId, req.user?.id || null, "UPDATE", existingTask, { title, description, task_type_id, priority, status, due_date, assigned_user_ids }, client);

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
    
    const task = await findTaskById(taskId);
    if (!task) {
      res.status(404).json({ error: "ไม่พบงาน" });
      return;
    }

    const assignments = await getTaskAssignments(taskId);

    if (req.user?.role === "staff") {
      const isAssigned = assignments.some(a => a.id === req.user?.id);
      if (!isAssigned) {
        res.status(403).json({ error: "คุณไม่มีสิทธิ์เปลี่ยนสถานะงานนี้" });
        return;
      }
      
      if (task.status === "cancelled") {
        res.status(403).json({ error: "เจ้าหน้าที่ไม่สามารถเปลี่ยนสถานะงานที่ถูกยกเลิกแล้ว" });
        return;
      }
    }

    await updateTaskStatus(taskId, status, progress ?? 0);
    
    await createAuditLog(taskId, req.user?.id || null, "STATUS_CHANGE", { status: task.status, progress: task.progress }, { status, progress });

    for (const a of assignments) {
      // Don't notify the person who made the change
      if (a.id === req.user?.id) continue;
      
      await createNotification(
        a.id, "สถานะเปลี่ยน",
        `งาน "${task.title}" เปลี่ยนสถานะเป็น: ${STATUS_THAI[status] || status}`,
        "status_changed", taskId
      );
    }
    res.json({ success: true });
  } catch (err) { next(err); }
}

/** DELETE /api/tasks/:id */
export async function deleteTaskHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const existingTask = await findTaskById(Number(req.params.id));
    if (existingTask) {
      await createAuditLog(existingTask.id as number, req.user?.id || null, "DELETE", existingTask, null);
    }
    await deleteTask(Number(req.params.id));
    res.json({ success: true });
  } catch (err) { next(err); }
}
