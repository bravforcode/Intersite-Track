import api from "./api";
import type { Notification } from "../types";

export const notificationService = {
  getNotifications: (userId: number) =>
    api.get<Notification[]>(`/api/notifications/${userId}`),

  getUnreadCount: (userId: number) =>
    api.get<{ count: number }>(`/api/notifications/${userId}/unread-count`),

  markRead: (id: number) =>
    api.patch<void>(`/api/notifications/${id}/read`),

  markAllRead: (userId: number) =>
    api.patch<void>(`/api/notifications/read-all/${userId}`),
};

export default notificationService;
