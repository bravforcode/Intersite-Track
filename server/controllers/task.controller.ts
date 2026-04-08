import { Request, Response, NextFunction } from "express";
import {
  findAllTasks, findTaskById, createTask, updateTask, deleteTask,
  updateTaskStatus, getTaskAssignments, setTaskAssignments, getCurrentAssignments,
  getTaskBlockers,
} from "../database/queries/task.queries.js";
import { findAllUsers, findUserById } from "../database/queries/user.queries.js";
import { createNotification } from "../database/queries/notification.queries.js";
import { db } from "../config/firebase-admin.js";
import { createAuditLog } from "../utils/auditLogger.js";
import { ensureTaskAccess } from "../utils/taskAccess.js";
import { lineService } from "../services/line.service.js";

const STATUS_THAI: Record<string, string> = {
  pending: "รอดำเนินการ", in_progress: "กำลังดำเนินการ",
  completed: "เสร็จสิ้น", cancelled: "ยกเลิก",
};

interface TaskTypeRow {
  id: string;
  name: string;
}

/** GET /api/tasks */
export async function getTasks(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const filters = {
      ...(req.query as Record<string, string>),
      ...(req.user?.role === "staff" ? { user_id: String(req.user.id) } : {}),
    };
    const tasks = await findAllTasks(filters);
    res.json(tasks);
  } catch (err) { next(err); }
}

/** GET /api/tasks/workspace */
export async function getTasksWorkspace(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const filters = {
      ...(req.query as Record<string, string>),
      ...(req.user?.role === "staff" ? { user_id: String(req.user.id) } : {}),
    };

    // Fetch task types from Firestore
    const taskTypesSnapshot = await db.collection("task_types").orderBy("id").get();
    const taskTypes = taskTypesSnapshot.docs.map((doc) => ({
      id: doc.id,
      name: doc.data().name,
    }));

    const [tasks] = await Promise.all([
      findAllTasks(filters),
    ]);

    let users: any[] = [];

    // SECURITY FIX: Only admins can fetch all users. Staff see task-context users only.
    if (req.user?.role === "admin") {
      const allUsers = await findAllUsers();
      users = allUsers.map(({ password: _pw, ...u }) => u);
    } else if (req.user?.role === "staff") {
      // Staff: Extract users from their assigned tasks (safe fields only)
      const userIds = new Set<string>();
      for (const task of tasks) {
        if (task.assignments) {
          for (const assignment of task.assignments) {
            userIds.add(assignment.id);
          }
        }
      }
      users = Array.from(userIds).map((id) => ({
        id,
        first_name: tasks
          .flatMap((t) => t.assignments || [])
          .find((a) => a.id === id)?.first_name || "",
        last_name: tasks
          .flatMap((t) => t.assignments || [])
          .find((a) => a.id === id)?.last_name || "",
        // NO email, NO line_user_id for staff
      }));
    }

    res.json({
      tasks,
      users,
      taskTypes,
    });
  } catch (err) {
    next(err);
  }
}

/** GET /api/tasks/:id */
export async function getTask(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const access = await ensureTaskAccess(req.user, req.params.id);
    if (!access.ok || !access.task) {
      res.status(access.status ?? 403).json({ error: access.error ?? "คุณไม่มีสิทธิ์เข้าถึงงานนี้" });
      return;
    }

    res.json(access.task);
  } catch (err) { next(err); }
}

/** POST /api/tasks */
export async function createTaskHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { title, description, task_type_id, priority, due_date, created_by, assigned_user_ids, project_id } = req.body;
    if (!title) { res.status(400).json({ error: "กรุณาระบุชื่องาน" }); return; }

    const taskId = await createTask({ title, description, task_type_id, priority, due_date, created_by, project_id });

    if (assigned_user_ids?.length) {
      await setTaskAssignments(undefined, taskId, assigned_user_ids);
      for (const uid of assigned_user_ids) {
        await createNotification(uid, "งานใหม่", `คุณได้รับมอบหมายงาน: ${title}`, "task_assigned", taskId);
        
        // LINE Notification
        const user = await findUserById(uid);
        if (user?.line_user_id) {
          await lineService.notifyNewTask(user.line_user_id, title);
        }
      }
    }

    await createAuditLog(
      taskId,
      req.user?.id || null,
      "CREATE",
      null,
      { title, description, task_type_id, priority, due_date, assigned_user_ids }
    );

    res.json({ id: taskId });
  } catch (err) { next(err); }
}

/** PUT /api/tasks/:id */
export async function updateTaskHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const taskId = req.params.id;
    const { title, description, task_type_id, priority, status, due_date, assigned_user_ids, project_id } = req.body;
    const existingTask = await findTaskById(taskId);
    await updateTask(taskId, { title, description, task_type_id, priority, status, due_date, project_id });

    await createAuditLog(
      taskId,
      req.user?.id || null,
      "UPDATE",
      existingTask,
      { title, description, task_type_id, priority, status, due_date, assigned_user_ids }
    );

    const currentIds = await getCurrentAssignments(taskId);
    if (Array.isArray(assigned_user_ids)) {
      await setTaskAssignments(undefined, taskId, assigned_user_ids);
      for (const uid of assigned_user_ids) {
        if (!currentIds.includes(uid)) {
          // New assignee: only send 'new task' notification
          await createNotification(uid, "งานใหม่", `คุณได้รับมอบหมายงาน: ${title}`, "task_assigned", taskId);
          
          // LINE Notification
          const user = await findUserById(uid);
          if (user?.line_user_id) {
            await lineService.notifyNewTask(user.line_user_id, title);
          }
        } else {
          // Existing assignee: send update notification
          await createNotification(uid, "แก้ไขงาน", `งาน "${title}" ได้รับการแก้ไข`, "task_updated", taskId);
          
          // LINE Notification
          const user = await findUserById(uid);
          if (user?.line_user_id) {
            await lineService.sendMessage(user.line_user_id, `🔔 งาน "${title}" ได้รับการแก้ไข\n\nกรุณาเข้าตรวจสอบในระบบ`);
          }
        }
      }
    }

    res.json({ success: true });
  } catch (err) { next(err); }
}

/** PATCH /api/tasks/:id/status */
export async function updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const taskId = req.params.id;
    const { status, progress } = req.body;

    const access = await ensureTaskAccess(req.user, taskId);

    if (!access.ok || !access.task) {
      res.status(access.status ?? 403).json({ error: access.error ?? "คุณไม่มีสิทธิ์เปลี่ยนสถานะงานนี้" });
      return;
    }

    const task = access.task;
    const assignments = task.assignments ?? [];

    if (req.user?.role === "staff") {
      if (task.status === "cancelled") {
        res.status(403).json({ error: "พนักงานไม่สามารถเปลี่ยนสถานะงานที่ถูกยกเลิกแล้ว" });
        return;
      }
    }

    const nextProgress = typeof progress === "number" ? progress : task.progress;

    await updateTaskStatus(taskId, status, nextProgress);
    
    await createAuditLog(taskId, req.user?.id || null, "STATUS_CHANGE", { status: task.status, progress: task.progress }, { status, progress: nextProgress });

    for (const a of assignments) {
      // Don't notify the person who made the change
      if (a.id === req.user?.id) continue;
      
      await createNotification(
        a.id, "สถานะเปลี่ยน",
        `งาน "${task.title}" เปลี่ยนสถานะเป็น: ${STATUS_THAI[status] || status}`,
        "status_changed", taskId
      );

      // LINE Notification
      const user = await findUserById(a.id);
      if (user?.line_user_id) {
        await lineService.sendMessage(user.line_user_id, `🔔 งาน "${task.title}" เปลี่ยนสถานะเป็น: ${STATUS_THAI[status] || status}\n\nกรุณาเข้าตรวจสอบในระบบ`);
      }
    }
    res.json({ success: true });
  } catch (err) { next(err); }
}

/** DELETE /api/tasks/:id */
export async function deleteTaskHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const taskId = req.params.id;
    const existingTask = await findTaskById(taskId);
    if (existingTask) {
      await createAuditLog(existingTask.id as string, req.user?.id || null, "DELETE", existingTask, null);
    }
    await deleteTask(taskId);
    res.json({ success: true });
  } catch (err) { next(err); }
}

export async function getBlockers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const taskId = req.params.id;
    const blockers = await getTaskBlockers(taskId);
    res.json(blockers);
  } catch (err) { next(err); }
}
