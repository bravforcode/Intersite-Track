import { Request, Response, NextFunction } from "express";
import {
  getNotificationsByUser, getUnreadCount,
  markNotificationRead, markAllNotificationsRead,
  getNotificationById,
} from "../database/queries/notification.queries.js";

/**
 * Helper function to ensure a user has access to a notification.
 * Admins can access any notification, non-admins can only access their own.
 */
async function ensureNotificationAccess(
  notificationId: string,
  userId: string,
  userRole: string
): Promise<void> {
  // Admin always has access
  if (userRole === "admin") {
    return;
  }

  // Non-admin must own the notification
  const notification = await getNotificationById(notificationId);
  if (notification.user_id !== userId) {
    throw new Error("FORBIDDEN");
  }
}

export async function getNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const notifications = await getNotificationsByUser(req.params.userId);
    res.json(notifications);
  } catch (err) { next(err); }
}

export async function getUnreadNotificationCount(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const count = await getUnreadCount(req.params.userId);
    res.json({ count });
  } catch (err) { next(err); }
}

export async function markRead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await ensureNotificationAccess(req.params.id, req.user!.id, req.user!.role);
    await markNotificationRead(req.params.id);
    res.json({ success: true });
  } catch (err) {
    if ((err as Error).message === "FORBIDDEN") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next(err);
  }
}

export async function markAllRead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await markAllNotificationsRead(req.params.userId);
    res.json({ success: true });
  } catch (err) { next(err); }
}
