import { findAllTasks, type Task } from "./task.queries.js";
import { findAllUsers } from "./user.queries.js";
import { supabaseAdmin } from "../../config/supabase.js";

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
  overdue: number;
  blocked: number;
  owned_projects: number;
}

export async function getStaffReport(): Promise<StaffReportRow[]> {
  const [users, tasks, projectsResult] = await Promise.all([
    findAllUsers(),
    findAllTasks(),
    supabaseAdmin.from("projects").select("id, owner_id")
  ]);

  const projects = projectsResult.data ?? [];
  const now = new Date().toISOString().split('T')[0];

  return users
    .map((user) => {
      const assignedTasks = tasks.filter(
        (task) => task.assignments?.some((assignment) => assignment.id === user.id) ?? false
      );

      const userOwnedProjects = projects.filter(p => p.owner_id === user.id);

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
        overdue: assignedTasks.filter(t => t.due_date && t.due_date < now && t.status !== 'completed').length,
        blocked: assignedTasks.filter(t => t.is_blocked).length,
        owned_projects: userOwnedProjects.length,
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

export async function getDepartmentWorkload(): Promise<any[]> {
  const [tasks, departmentsResult] = await Promise.all([
    findAllTasks(),
    supabaseAdmin.from("departments").select("id, name")
  ]);

  const departments = departmentsResult.data ?? [];
  
  return departments.map(dept => {
    const deptTasks = tasks.filter(t => {
      // Find if any assignee is in this department
      // This is a simplification, ideally we'd join but findAllTasks returns mapped objects
      // We'll need to check the department_name in the assignments if available
      // or we just use the user's department.
      // For now, let's assume we want to know tasks per department based on the creator's department 
      // or better, based on the project's department if it existed.
      // Let's use the users' department who are assigned to the task.
      return t.assignments?.some(a => (a as any).department_name === dept.name);
    });

    return {
      department: dept.name,
      total: deptTasks.length,
      completed: deptTasks.filter(t => t.status === 'completed').length,
      inProgress: deptTasks.filter(t => t.status === 'in_progress').length,
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
    const dateStr = date.toISOString().split('T')[0];
    
    // Count tasks that were NOT completed by this date
    const remaining = tasks.filter((t: Task) => {
      if (t.status === 'cancelled') return false;
      if (t.status !== 'completed') return true;
      // If completed, check if it was completed AFTER this date
      return t.updated_at > date.toISOString();
    }).length;

    result.push({ date: dateStr, remaining });
  }
  
  return result;
}

