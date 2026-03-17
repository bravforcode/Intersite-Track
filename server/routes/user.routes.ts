import { Router } from "express";
import {
  getUsers, getUser, createUserHandler, updateUserHandler,
  deleteUserHandler, getUserTasksHandler,
} from "../controllers/user.controller";
import { requireAuth, requireRole } from "../middleware/auth.middleware";

const router = Router();

router.get("/", requireAuth, getUsers);
router.get("/:id", requireAuth, getUser);
router.post("/", requireAuth, requireRole("admin"), createUserHandler);
router.put("/:id", requireAuth, requireRole("admin"), updateUserHandler);
router.delete("/:id", requireAuth, requireRole("admin"), deleteUserHandler);
router.get("/:id/tasks", requireAuth, getUserTasksHandler);

export default router;
