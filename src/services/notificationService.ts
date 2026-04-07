import api from "./api";
import type { Notification } from "../types";

export const notificationService = {
  getNotifications: (userId: string) =>
    api.get<Notification[]>(`/api/notifications/${userId}`),

  getUnreadCount: (userId: string) =>
    api.get<{ count: number }>(`/api/notifications/${userId}/unread-count`),

  markRead: (id: string) =>
    api.patch<void>(`/api/notifications/${id}/read`),

  markAllRead: (userId: string) =>
    api.patch<void>(`/api/notifications/read-all/${userId}`),
};

export default notificationService;
