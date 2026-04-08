import { Router } from "express";
import {
  getUsers, getUser, createUserHandler, updateUserHandler,
  deleteUserHandler, getUserTasksHandler, getTaskContextUsersHandler,
} from "../controllers/user.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";

const router = Router();

// GET /api/users - RESTRICTED: Admin only, returns all users with all fields
router.get("/", requireAuth, requireRole("admin"), getUsers);

// GET /api/users/task-context - Staff endpoint, returns limited user data from their tasks
router.get("/task-context", requireAuth, getTaskContextUsersHandler);

// GET /api/users/:id - Individual user detail
router.get("/:id", requireAuth, getUser);

// POST /api/users - Create user (admin only)
router.post("/", requireAuth, requireRole("admin"), createUserHandler);

// PUT /api/users/:id - Update user (admin only)
router.put("/:id", requireAuth, requireRole("admin"), updateUserHandler);

// DELETE /api/users/:id - Delete user (admin only)
router.delete("/:id", requireAuth, requireRole("admin"), deleteUserHandler);

// GET /api/users/:id/tasks - Get user's tasks
router.get("/:id/tasks", requireAuth, getUserTasksHandler);

export default router;
