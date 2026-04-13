import { Bell, CheckCheck } from "lucide-react";
import { motion } from "motion/react";
import { NotificationItem } from "./NotificationItem";
import type { Notification } from "../../types";

interface NotificationsPageProps {
  notifications: Notification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onViewTask: (refId: string) => void;
}

export function NotificationsPage({ notifications, onMarkRead, onMarkAllRead, onViewTask }: NotificationsPageProps) {
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="app-surface-subtle rounded-2xl px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] app-soft mb-1">ยังไม่อ่าน</p>
            <p className="text-xl font-serif font-bold text-[#5A5A40]">{unreadCount}</p>
          </div>
          <div className="app-surface-subtle rounded-2xl px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] app-soft mb-1">ทั้งหมด</p>
            <p className="text-xl font-serif font-bold app-heading">{notifications.length}</p>
          </div>
        </div>
        <button
          onClick={onMarkAllRead}
          className="text-sm text-[#5A5A40] font-medium hover:underline flex items-center gap-1"
        >
          <CheckCheck size={16} /> อ่านทั้งหมด
        </button>
      </div>

      <div className="space-y-3">
        {notifications.map((n) => (
          <NotificationItem key={n.id} notification={n} onMarkRead={onMarkRead} onViewTask={onViewTask} />
        ))}
        {notifications.length === 0 && (
          <div className="text-center py-16 app-soft">
            <Bell size={48} className="mx-auto mb-4 opacity-50" />
            <p>ไม่มีการแจ้งเตือน</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
