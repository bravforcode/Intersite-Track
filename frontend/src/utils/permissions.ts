import { User, Task } from "../types";

export type PermissionAction =
  | "task:create"
  | "task:update_status"
  | "task:edit_details"
  | "task:delete"
  | "task:comment"
  | "board:drag";

/**
 * Validates if a user can perform a specific action, optionally on a specific task.
 */
export function canPerformAction(user: User | null | undefined, action: PermissionAction, task?: Task): boolean {
  if (!user) return false;
  if (user.role === "admin") return true; // Admins can do everything

  // Staff permissions
  switch (action) {
    case "task:create":
      return false; // Only admins create tasks (based on current app logic)
      
    case "task:update_status":
    case "board:drag":
      // Staff can only update status/drag if they are assigned to the task
      if (!task) return false;
      return task.assignments?.some(assignee => assignee.id === user.id) ?? false;

    case "task:edit_details":
    case "task:delete":
      return false; // Staff cannot edit core details or delete

    case "task:comment":
      // Staff can comment on any task they can see (all visible tasks for now)
      return true;

    default:
      return false;
  }
}
