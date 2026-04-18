import { Request, Response, NextFunction } from "express";
import {
  findAllTasks, findTaskById, createTask, updateTask, deleteTask,
  updateTaskStatus, setTaskAssignments, getCurrentAssignments,
  getTaskBlockers, findTasksByStatus, findTasksByPriority, findTasksByProject,
  findTasksByAssignee, findTasksByDueDateRange,
} from "../database/queries/task.queries.js";
import { findAllUsers, findUserById } from "../database/queries/user.queries.js";
import { createNotification } from "../database/queries/notification.queries.js";
import { db } from "../config/firebase-admin.js";
import { createAuditLog } from "../utils/auditLogger.js";
import { ensureTaskAccess } from "../utils/taskAccess.js";
import { lineService } from "../services/line.service.js";
import { parsePaginationParams, createPaginatedResponse, buildOffsetPagination } from "../utils/pagination.js";

const STATUS_THAI: Record<string, string> = {
  pending: "รอดำเนินการ", in_progress: "กำลังดำเนินการ",
  completed: "เสร็จสิ้น", cancelled: "ยกเลิก",
};



/** GET /api/tasks - Optimized with indexed queries */
export async function getTasks(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { limit, offset } = parsePaginationParams(req.query);
    
    // SECURITY: Enforce role-based access control
    if (!req.user?.role) {
      res.status(401).json({ error: "กรุณาเข้าสู่ระบบก่อน" });
      return;
    }

    // Build filters - CRITICAL: Staff users can ONLY see their own tasks
    const allowedFilterKeys = ["status", "priority", "project_id", "dateFrom", "dateTo", "date_from", "date_to"];
    const baseFilters: Record<string, string> = {};
    
    for (const key of allowedFilterKeys) {
      if (req.query[key]) {
        baseFilters[key] = String(req.query[key]);
      }
    }

    // SECURITY: Staff role ALWAYS restricted to their own tasks
    const enforceStaffRestriction = req.user.role === "staff";
    const staffUserId = enforceStaffRestriction ? String(req.user.id) : undefined;

    let tasks = [];

    // Route to optimized query based on filters
    if (staffUserId) {
      // SECURITY: Staff user MUST fetch only their assigned tasks
      const status = baseFilters.status as any;
      tasks = await findTasksByAssignee(staffUserId, status, limit + offset);
    } else if (baseFilters.status && baseFilters.priority) {
      // Admin: Dual filter
      const status = baseFilters.status as any;
      const priority = baseFilters.priority as any;
      tasks = await findTasksByPriority(priority, status, limit + offset);
    } else if (baseFilters.status) {
      // Admin: Single status filter
      tasks = await findTasksByStatus(baseFilters.status as any, limit + offset);
    } else if (baseFilters.priority) {
      // Admin: Single priority filter
      tasks = await findTasksByPriority(baseFilters.priority as any, undefined, limit + offset);
    } else if (baseFilters.project_id) {
      // Admin: Project filter
      tasks = await findTasksByProject(baseFilters.project_id, undefined, limit + offset);
    } else if (baseFilters.dateFrom && baseFilters.dateTo) {
      // Admin: Date range filter
      tasks = await findTasksByDueDateRange(
        baseFilters.dateFrom,
        baseFilters.dateTo,
        baseFilters.status as any,
        limit + offset
      );
    } else {
      // Admin: No specific filter
      tasks = await findAllTasks({});
    }

    // Apply pagination: slice results after retrieval
    const paginatedTasks = tasks.slice(offset, offset + limit);
    const pagination = buildOffsetPagination(tasks.length, offset, limit);

    res.json(createPaginatedResponse(paginatedTasks, pagination));
  } catch (err) { 
    next(err); 
  }
}

/** GET /api/tasks/workspace - Optimized with indexed queries */
export async function getTasksWorkspace(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { limit, offset } = parsePaginationParams(req.query);
    
    // Build filters — explicit type preserves index signature lost by spread inference
    const filters: Record<string, string | undefined> = {
      ...(req.query as Record<string, string>),
      ...(req.user?.role === "staff" ? { user_id: String(req.user.id) } : {}),
    };

    // Fetch task types from Firestore
    const taskTypesSnapshot = await db.collection("task_types").orderBy("id").get();
    const taskTypes = taskTypesSnapshot.docs.map((doc) => ({
      id: doc.id,
      name: doc.data().name,
    }));

    // Route to optimized query based on filters
    let tasks = [];
    if (filters.user_id) {
      const status = filters.status as any;
      tasks = await findTasksByAssignee(filters.user_id, status, limit + offset);
    } else if (filters.status && filters.priority) {
      const status = filters.status as any;
      const priority = filters.priority as any;
      tasks = await findTasksByPriority(priority, status, limit + offset);
    } else if (filters.status) {
      tasks = await findTasksByStatus(filters.status as any, limit + offset);
    } else if (filters.priority) {
      tasks = await findTasksByPriority(filters.priority as any, undefined, limit + offset);
    } else if (filters.project_id) {
      tasks = await findTasksByProject(filters.project_id, undefined, limit + offset);
    } else {
      tasks = await findAllTasks(filters);
    }

    const paginatedTasks = tasks.slice(offset, offset + limit);
    const pagination = buildOffsetPagination(tasks.length, offset, limit);

    let users: any[] = [];

    // SECURITY FIX: Only admins can fetch all users. Staff see task-context users only.
    if (req.user?.role === "admin") {
      const allUsers = await findAllUsers();
      users = allUsers.map(({ password: _pw, ...u }) => u);
    } else if (req.user?.role === "staff") {
      // Staff: Extract users from their assigned tasks (safe fields only)
      const userIds = new Set<string>();
      for (const task of paginatedTasks) {
        if (task.assignments) {
          for (const assignment of task.assignments) {
            userIds.add(assignment.id);
          }
        }
      }
      users = Array.from(userIds).map((id) => ({
        id,
        first_name: paginatedTasks
          .flatMap((t) => t.assignments || [])
          .find((a) => a.id === id)?.first_name || "",
        last_name: paginatedTasks
          .flatMap((t) => t.assignments || [])
          .find((a) => a.id === id)?.last_name || "",
        // NO email, NO line_user_id for staff
      }));
    }

    res.json({
      data: paginatedTasks,
      pagination,
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
    const { title, description, task_type_id, priority, status, due_date, assigned_user_ids, project_id } = req.body;
    const createdBy = String(req.user?.id ?? req.body?.created_by ?? "").trim();
    
    // Validate required fields
    if (!title || typeof title !== "string" || title.trim().length === 0) {
      res.status(400).json({ error: "กรุณาระบุชื่องาน (ข้อความไม่ว่าง)" });
      return;
    }
    if (title.length > 255) {
      res.status(400).json({ error: "ชื่องานต้องไม่เกิน 255 ตัวอักษร" });
      return;
    }
    if (!createdBy) {
      res.status(401).json({ error: "กรุณาเข้าสู่ระบบก่อนสร้างงาน" });
      return;
    }

    const taskId = await createTask({
      title,
      description,
      task_type_id,
      priority,
      status,
      due_date,
      created_by: createdBy,
      project_id,
    });

    if (assigned_user_ids?.length) {
      await setTaskAssignments(undefined, taskId, assigned_user_ids);
      for (const uid of assigned_user_ids) {
        try {
          await createNotification(uid, "งานใหม่", `คุณได้รับมอบหมายงาน: ${title}`, "task_assigned", taskId);
          
          // LINE Notification - wrapped in try-catch to prevent crash
          try {
            const user = await findUserById(uid);
            if (user?.line_user_id) {
              await lineService.notifyNewTask(user.line_user_id, title);
            }
          } catch (lineErr) {
            console.error(`[LINE] Failed to notify ${uid}: ${lineErr instanceof Error ? lineErr.message : "Unknown error"}`);
            // Don't fail the entire request if LINE notification fails
          }
        } catch (notifErr) {
          console.error(`Failed to create notification for ${uid}: ${notifErr instanceof Error ? notifErr.message : "Unknown error"}`);
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

    res.status(201).json({ id: taskId });
  } catch (err) { next(err); }
}

/** PUT /api/tasks/:id */
export async function updateTaskHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const taskId = req.params.id;
    const { title, description, task_type_id, priority, status, due_date, assigned_user_ids, project_id } = req.body;
    
    // Validate title if provided
    if (title !== undefined && (typeof title !== "string" || title.trim().length === 0)) {
      res.status(400).json({ error: "ชื่องานต้องเป็นข้อความไม่ว่าง" });
      return;
    }
    if (title && title.length > 255) {
      res.status(400).json({ error: "ชื่องานต้องไม่เกิน 255 ตัวอักษร" });
      return;
    }
    
    const existingTask = await findTaskById(taskId);
    if (!existingTask) {
      res.status(404).json({ error: "ไม่พบงานนี้" });
      return;
    }

    await updateTask(taskId, { title, description, task_type_id, priority, status, due_date, project_id });

    await createAuditLog(
      taskId,
      req.user?.id || null,
      "UPDATE",
      existingTask,
      { title, description, task_type_id, priority, status, due_date, assigned_user_ids }
    );

    // Use existing title as fallback when title is not being updated
    const effectiveTitle = title ?? existingTask.title;

    const currentIds = await getCurrentAssignments(taskId);
    if (Array.isArray(assigned_user_ids)) {
      await setTaskAssignments(undefined, taskId, assigned_user_ids);

      // Only notify about NEW assignments, not every update
      const newAssignees = assigned_user_ids.filter(uid => !currentIds.includes(uid));

      for (const uid of newAssignees) {
        try {
          await createNotification(uid, "งานใหม่", `คุณได้รับมอบหมายงาน: ${effectiveTitle}`, "task_assigned", taskId);

          try {
            const user = await findUserById(uid);
            if (user?.line_user_id) {
              await lineService.notifyNewTask(user.line_user_id, effectiveTitle);
            }
          } catch (lineErr) {
            console.error(`[LINE] Failed to notify new assignee ${uid}: ${lineErr instanceof Error ? lineErr.message : "Unknown"}`);
          }
        } catch (notifErr) {
          console.error(`Failed to notify new assignee ${uid}: ${notifErr instanceof Error ? notifErr.message : "Unknown"}`);
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
    if (!existingTask) {
      res.status(404).json({ error: "ไม่พบงานนี้" });
      return;
    }
    await createAuditLog(existingTask.id as string, req.user?.id || null, "DELETE", existingTask, null);
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
