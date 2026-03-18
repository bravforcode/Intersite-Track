import { Router } from "express";
import {
  getNotifications, getUnreadNotificationCount, markRead, markAllRead,
} from "../controllers/notification.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { toggleChecklist } from "../controllers/taskUpdate.controller.js";

const router = Router();

router.get("/:userId", requireAuth, getNotifications);
router.get("/:userId/unread-count", requireAuth, getUnreadNotificationCount);
router.patch("/:id/read", requireAuth, markRead);
router.patch("/read-all/:userId", requireAuth, markAllRead);

export default router;
