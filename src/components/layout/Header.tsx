import { Bell, Plus } from "lucide-react";
import { motion } from "motion/react";
import type { User } from "../../types";

interface HeaderProps {
  title: string;
  user: User;
  activeTab: string;
  unreadCount: number;
  onNotificationClick: () => void;
  onCreateTask?: () => void;
  onCreateUser?: () => void;
}

export function Header({
  title,
  user,
  activeTab,
  unreadCount,
  onNotificationClick,
  onCreateTask,
  onCreateUser,
}: HeaderProps) {
  return (
    <header className="h-16 bg-white border-b border-black/5 flex items-center justify-between px-8 flex-shrink-0">
      <h2 className="text-xl font-serif font-bold text-[#1a1a1a]">{title}</h2>
      <div className="flex items-center gap-4">
        <motion.button
          onClick={onNotificationClick}
          animate={unreadCount > 0 ? { rotate: [0, -15, 15, -10, 10, 0] } : {}}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          whileHover={{ scale: 1.1 }}
          className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-0.5 -right-0.5 bg-rose-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center"
            >
              {unreadCount}
            </motion.span>
          )}
        </motion.button>

        {user.role === "admin" && activeTab === "tasks" && onCreateTask && (
          <button
            onClick={onCreateTask}
            className="bg-[#5A5A40] text-white px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 shadow-md hover:bg-[#4A4A30] transition-colors"
          >
            <Plus size={18} /> สร้างงานใหม่
          </button>
        )}

        {user.role === "admin" && activeTab === "staff" && onCreateUser && (
          <button
            onClick={onCreateUser}
            className="bg-[#5A5A40] text-white px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 shadow-md hover:bg-[#4A4A30] transition-colors"
          >
            <Plus size={18} /> เพิ่มเจ้าหน้าที่
          </button>
        )}
      </div>
    </header>
  );
}
