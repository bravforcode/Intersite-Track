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

  subscribeToNotifications: (userId: string, callback: (notifications: Notification[], unreadCount: number) => void) => {
    let active = true;

    const loadNotifications = async () => {
      try {
        const [notifications, unread] = await Promise.all([
          notificationService.getNotifications(userId),
          notificationService.getUnreadCount(userId),
        ]);

        if (active) {
          callback(notifications, unread.count);
        }
      } catch (error) {
        console.error("Failed to load notifications:", error);
      }
    };

    void loadNotifications();
    const interval = window.setInterval(() => {
      void loadNotifications();
    }, 30_000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }
};

export default notificationService;
