import { Router, type Request, type Response } from "express";
import {
  getNotifications, getUnreadNotificationCount, markRead, markAllRead,
} from "../controllers/notification.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { registerSSEClient } from "../services/notification.dispatcher.js";

const router = Router();

// ─── SSE Stream ───────────────────────────────────────────────────────────────
// GET /notifications/stream
// Auth via session cookie / Bearer header (handled by requireAuth)
router.get("/stream", requireAuth, (req: Request, res: Response) => {
  const userId = req.user!.id;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  // Heartbeat to keep proxy connections alive
  const heartbeat = setInterval(() => {
    try { res.write(`: heartbeat\n\n`); } catch { clearInterval(heartbeat); }
  }, 30_000);

  const cleanup = registerSSEClient({
    userId,
    write: (data: string) => res.write(data),
  });

  res.write(`data: ${JSON.stringify({ event: "connected", userId })}\n\n`);

  req.on("close", () => {
    clearInterval(heartbeat);
    cleanup();
  });
});

router.get("/:userId", requireAuth, getNotifications);
router.get("/:userId/unread-count", requireAuth, getUnreadNotificationCount);
router.patch("/:id/read", requireAuth, markRead);
router.patch("/read-all/:userId", requireAuth, markAllRead);

export default router;
