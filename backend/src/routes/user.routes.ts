import { Router } from "express";
import {
  getUsers, getUser, createUserHandler, updateUserHandler,
  deleteUserHandler, getUserTasksHandler, getTaskContextUsersHandler,
} from "../controllers/user.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";

const router = Router();

// GET /api/users — Admin only: returns all users with full details (includes email, department)
router.get("/", requireAuth, requireRole("admin"), getUsers);

// GET /api/users/task-context — Any authenticated user: returns only id, first_name, last_name
// of users who share tasks — no email, no LINE ID
router.get("/task-context", requireAuth, getTaskContextUsersHandler);

// GET /api/users/:id — Admin or the user themselves (enforced in controller)
router.get("/:id", requireAuth, getUser);

// POST /api/users — Admin only: create new user account
router.post("/", requireAuth, requireRole("admin"), createUserHandler);

// PUT /api/users/:id — Admin only: update user profile/role
router.put("/:id", requireAuth, requireRole("admin"), updateUserHandler);

// DELETE /api/users/:id — Admin only: remove user account
router.delete("/:id", requireAuth, requireRole("admin"), deleteUserHandler);

// GET /api/users/:id/tasks — Admin or the user themselves (enforced in controller)
router.get("/:id/tasks", requireAuth, getUserTasksHandler);

export default router;
