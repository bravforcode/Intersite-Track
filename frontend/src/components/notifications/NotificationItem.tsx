import React from "react";
import { Bell, Plus, Edit3, AlertTriangle, TrendingUp } from "lucide-react";
import { formatDateTime } from "../../utils/formatters";
import type { Notification } from "../../types";

const typeIcon: Record<string, React.ReactNode> = {
  task_assigned: <Plus size={16} className="text-blue-500" />,
  task_updated: <Edit3 size={16} className="text-amber-500" />,
  task_deadline: <AlertTriangle size={16} className="text-rose-500" />,
  status_changed: <TrendingUp size={16} className="text-emerald-500" />,
  info: <Bell size={16} className="text-gray-500" />,
};

interface NotificationItemProps {
  notification: Notification;
  onMarkRead: (id: string) => void;
  onViewTask: (refId: string) => void;
}

export function NotificationItem({ notification: n, onMarkRead, onViewTask }: NotificationItemProps) {
  return (
    <div
      className={`app-surface p-4 rounded-2xl transition-all cursor-pointer hover:shadow-md ${
        n.is_read ? "border-black/5 opacity-80" : "border-[#5A5A40]/20 bg-[#5A5A40]/[0.03]"
      }`}
      onClick={() => {
        if (!n.is_read) onMarkRead(n.id);
        if (n.reference_id) onViewTask(n.reference_id);
      }}
    >
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
          {typeIcon[n.type] || typeIcon.info}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <p className="font-medium text-sm app-heading">{n.title}</p>
            {!n.is_read && <span className="w-2 h-2 rounded-full bg-[#5A5A40] flex-shrink-0" />}
          </div>
          <p className="text-sm app-muted">{n.message}</p>
          <p className="text-xs app-soft mt-1">{formatDateTime(n.created_at)}</p>
        </div>
      </div>
    </div>
  );
}
