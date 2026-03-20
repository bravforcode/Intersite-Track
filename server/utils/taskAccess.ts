import type { Task } from "../database/queries/task.queries.js";
import { findTaskById } from "../database/queries/task.queries.js";

interface TaskAccessResult {
  ok: boolean;
  status?: number;
  error?: string;
  task?: Task;
}

export async function ensureTaskAccess(user: Express.Request["user"], taskId: number): Promise<TaskAccessResult> {
  if (!user) {
    return {
      ok: false,
      status: 401,
      error: "กรุณาเข้าสู่ระบบก่อน",
    };
  }

  const task = await findTaskById(taskId);

  if (!task) {
    return {
      ok: false,
      status: 404,
      error: "ไม่พบงาน",
    };
  }

  if (user.role === "admin") {
    return {
      ok: true,
      task,
    };
  }

  const isAssigned = task.assignments?.some((assignee) => assignee.id === user.id) ?? false;

  if (!isAssigned) {
    return {
      ok: false,
      status: 403,
      error: "คุณไม่มีสิทธิ์เข้าถึงงานนี้",
    };
  }

  return {
    ok: true,
    task,
  };
}
