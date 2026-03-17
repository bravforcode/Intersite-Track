import { Bell, CheckCheck } from "lucide-react";
import { motion } from "motion/react";
import { NotificationItem } from "./NotificationItem";
import type { Notification } from "../../types";

interface NotificationsPageProps {
  notifications: Notification[];
  onMarkRead: (id: number) => void;
  onMarkAllRead: () => void;
  onViewTask: (refId: number) => void;
}

export function NotificationsPage({ notifications, onMarkRead, onMarkAllRead, onViewTask }: NotificationsPageProps) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">
          {notifications.filter((n) => !n.is_read).length} รายการที่ยังไม่ได้อ่าน
        </p>
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
          <div className="text-center py-16 text-gray-400">
            <Bell size={48} className="mx-auto mb-4 opacity-50" />
            <p>ไม่มีการแจ้งเตือน</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
