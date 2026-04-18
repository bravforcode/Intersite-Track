import { Request, Response, NextFunction } from "express";
import type { NotificationRow } from "../database/queries/notification.queries.js";
import * as defaultQueries from "../database/queries/notification.queries.js";

// ─── Query dependency interface ───────────────────────────────────────────────
// Exported so tests can inject an in-memory implementation without touching Firestore.
export interface NotificationQueries {
  getNotificationsByUser: (userId: string) => Promise<NotificationRow[]>;
  getNotificationById: (id: string) => Promise<NotificationRow>;
  getUnreadCount: (userId: string) => Promise<number>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: (userId: string) => Promise<void>;
}

// ─── Handler factory ──────────────────────────────────────────────────────────
// Returns fully-wired Express handlers bound to the provided query layer.
// Production code calls this with no arguments (uses real Firestore queries).
// Tests call this with an in-memory implementation.
export function createNotificationHandlers(queries: NotificationQueries = defaultQueries) {
  /**
   * Helper: verify the caller has access to the given notification.
   * Admins can access any notification; non-admins can only access their own.
   */
  async function ensureNotificationAccess(
    notificationId: string,
    userId: string,
    userRole: string
  ): Promise<void> {
    if (userRole === "admin") return;
    const notification = await queries.getNotificationById(notificationId);
    if (notification.user_id !== userId) {
      throw new Error("FORBIDDEN");
    }
  }

  async function getNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const requestedUserId = req.params.userId;
      const isAdmin = req.user!.role === "admin";
      const isOwnData = req.user!.id === requestedUserId;

      if (!isAdmin && !isOwnData) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      const notifications = await queries.getNotificationsByUser(requestedUserId);
      res.json(notifications);
    } catch (err) { next(err); }
  }

  async function getUnreadNotificationCount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const requestedUserId = req.params.userId;
      const isAdmin = req.user!.role === "admin";
      const isOwnData = req.user!.id === requestedUserId;

      if (!isAdmin && !isOwnData) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      const count = await queries.getUnreadCount(requestedUserId);
      res.json({ count });
    } catch (err) { next(err); }
  }

  async function markRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await ensureNotificationAccess(req.params.id, req.user!.id, req.user!.role);
      await queries.markNotificationRead(req.params.id);
      res.json({ success: true });
    } catch (err) {
      if ((err as Error).message === "FORBIDDEN") {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      next(err);
    }
  }

  async function markAllRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const requestedUserId = req.params.userId;
      const isAdmin = req.user!.role === "admin";
      const isOwnData = req.user!.id === requestedUserId;

      if (!isAdmin && !isOwnData) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      await queries.markAllNotificationsRead(requestedUserId);
      res.json({ success: true });
    } catch (err) { next(err); }
  }

  return { getNotifications, getUnreadNotificationCount, markRead, markAllRead };
}

// ─── Default exports (production) ────────────────────────────────────────────
// These use the real Firestore-backed queries and are what notification.routes.ts imports.
export const {
  getNotifications,
  getUnreadNotificationCount,
  markRead,
  markAllRead,
} = createNotificationHandlers();
