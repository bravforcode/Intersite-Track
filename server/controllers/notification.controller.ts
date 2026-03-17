import { Request, Response, NextFunction } from "express";
import {
  getNotificationsByUser, getUnreadCount,
  markNotificationRead, markAllNotificationsRead,
} from "../database/queries/notification.queries";

export async function getNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const notifications = await getNotificationsByUser(Number(req.params.userId));
    res.json(notifications);
  } catch (err) { next(err); }
}

export async function getUnreadNotificationCount(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const count = await getUnreadCount(Number(req.params.userId));
    res.json({ count });
  } catch (err) { next(err); }
}

export async function markRead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await markNotificationRead(Number(req.params.id));
    res.json({ success: true });
  } catch (err) { next(err); }
}

export async function markAllRead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await markAllNotificationsRead(Number(req.params.userId));
    res.json({ success: true });
  } catch (err) { next(err); }
}
