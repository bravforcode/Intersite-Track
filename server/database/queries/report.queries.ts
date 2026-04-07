import { db } from "../../config/firebase-admin.js";
import { findAllTasks, type Task } from "./task.queries.js";
import { findAllUsers } from "./user.queries.js";

export interface StaffReportRow {
  id: string;
  first_name: string;
  last_name: string;
  role: "admin" | "staff";
  position: string;
  department_name: string;
  total_tasks: number;
  completed: number;
  in_progress: number;
  pending: number;
  overdue: number;
  blocked: number;
  owned_projects: number;
}

export async function getStaffReport(): Promise<StaffReportRow[]> {
  const [users, tasks, projectsSnap] = await Promise.all([
    findAllUsers(),
    findAllTasks(),
    db.collection("projects").select("owner_id").get(),
  ]);

  const projects = projectsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  const now = new Date().toISOString().split("T")[0];

  return users
    .map(user => {
      const assignedTasks = tasks.filter(
        task => task.assignments?.some(a => a.id === user.id) ?? false
      );
      const userOwnedProjects = projects.filter((p: any) => p.owner_id === user.id);

      return {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        position: user.position ?? "",
        department_name: user.department_name ?? "",
        total_tasks: assignedTasks.length,
        completed: assignedTasks.filter(t => t.status === "completed").length,
        in_progress: assignedTasks.filter(t => t.status === "in_progress").length,
        pending: assignedTasks.filter(t => t.status === "pending").length,
        overdue: assignedTasks.filter(
          t => t.due_date && t.due_date < now && t.status !== "completed"
        ).length,
        blocked: assignedTasks.filter(t => t.is_blocked).length,
        owned_projects: userOwnedProjects.length,
      };
    })
    .sort((a, b) => b.total_tasks - a.total_tasks);
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

  return [...grouped.values()].sort((a, b) =>
    a.date === b.date ? a.status.localeCompare(b.status) : a.date.localeCompare(b.date)
  );
}

export async function getStats(): Promise<{
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  cancelled: number;
}> {
  const tasks = await findAllTasks();
  return {
    total: tasks.length,
    completed: tasks.filter(t => t.status === "completed").length,
    inProgress: tasks.filter(t => t.status === "in_progress").length,
    pending: tasks.filter(t => t.status === "pending").length,
    cancelled: tasks.filter(t => t.status === "cancelled").length,
  };
}

export async function getDepartmentWorkload(): Promise<any[]> {
  const [tasks, deptsSnap] = await Promise.all([
    findAllTasks(),
    db.collection("departments").get(),
  ]);

  const departments = deptsSnap.docs.map(doc => ({ id: doc.id, name: doc.data().name }));

  const usersSnap = await db.collection("users").get();
  const userDeptMap = new Map<string, string>();
  for (const doc of usersSnap.docs) {
    userDeptMap.set(doc.id, doc.data().department_id ?? "");
  }

  return departments.map(dept => {
    const deptTasks = tasks.filter(t =>
      t.assignments?.some(a => userDeptMap.get(a.id) === dept.id)
    );
    return {
      department: dept.name,
      total: deptTasks.length,
      completed: deptTasks.filter(t => t.status === "completed").length,
      inProgress: deptTasks.filter(t => t.status === "in_progress").length,
    };
  });
}

export async function getBurnDownData(days: number = 30): Promise<any[]> {
  const tasks = await findAllTasks();
  const result = [];
  const now = new Date();

  for (let i = days; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];

    const remaining = tasks.filter((t: Task) => {
      if (t.status === "cancelled") return false;
      if (t.status !== "completed") return true;
      return t.updated_at > date.toISOString();
    }).length;

    result.push({ date: dateStr, remaining });
  }

  return result;
}
