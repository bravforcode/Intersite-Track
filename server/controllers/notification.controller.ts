import { Request, Response, NextFunction } from "express";
import {
  getNotificationsByUser, getUnreadCount,
  markNotificationRead, markAllNotificationsRead,
} from "../database/queries/notification.queries.js";

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
    await markNotificationRead(req.params.id);
    res.json({ success: true });
  } catch (err) { next(err); }
}

export async function markAllRead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await markAllNotificationsRead(req.params.userId);
    res.json({ success: true });
  } catch (err) { next(err); }
}
