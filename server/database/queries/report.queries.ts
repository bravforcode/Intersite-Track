import { findAllTasks } from "./task.queries.js";
import { findAllUsers } from "./user.queries.js";

export interface StaffReportRow {
  id: number;
  first_name: string;
  last_name: string;
  role: "admin" | "staff";
  position: string;
  department_name: string;
  total_tasks: number;
  completed: number;
  in_progress: number;
  pending: number;
}

export async function getStaffReport(): Promise<StaffReportRow[]> {
  const [users, tasks] = await Promise.all([findAllUsers(), findAllTasks()]);

  return users
    .map((user) => {
      const assignedTasks = tasks.filter(
        (task) => task.assignments?.some((assignment) => assignment.id === user.id) ?? false
      );

      return {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        position: user.position ?? "",
        department_name: user.department_name ?? "",
        total_tasks: assignedTasks.length,
        completed: assignedTasks.filter((task) => task.status === "completed").length,
        in_progress: assignedTasks.filter((task) => task.status === "in_progress").length,
        pending: assignedTasks.filter((task) => task.status === "pending").length,
      };
    })
    .sort((a, b) => b.total_tasks - a.total_tasks || a.id - b.id);
}

export async function getTasksByDateRange(
  start: string,
  end: string
): Promise<Record<string, unknown>[]> {
  const tasks = await findAllTasks();
  const grouped = new Map<string, { date: string; status: string; count: number }>();

  for (const task of tasks) {
    if (!task.due_date) continue;
    if (task.due_date < start || task.due_date > end) continue;

    const key = `${task.due_date}|${task.status}`;
    const current = grouped.get(key) ?? { date: task.due_date, status: task.status, count: 0 };
    current.count += 1;
    grouped.set(key, current);
  }

  return [...grouped.values()].sort((a, b) => {
    if (a.date === b.date) return a.status.localeCompare(b.status);
    return a.date.localeCompare(b.date);
  });
}

export async function getStats(): Promise<{
  total: number; completed: number; inProgress: number; pending: number; cancelled: number;
}> {
  const tasks = await findAllTasks();

  return {
    total: tasks.length,
    completed: tasks.filter((task) => task.status === "completed").length,
    inProgress: tasks.filter((task) => task.status === "in_progress").length,
    pending: tasks.filter((task) => task.status === "pending").length,
    cancelled: tasks.filter((task) => task.status === "cancelled").length,
  };
}
