import React from "react";
import { ClipboardList, LogOut } from "lucide-react";
import { motion } from "motion/react";
import type { User } from "../../types";

interface Tab {
  key: string;
  label: string;
  icon: React.ReactNode;
}

interface SidebarProps {
  user: User;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
  onProfileClick: () => void;
  unreadCount: number;
  tabs: Tab[];
}

export function Sidebar({ user, activeTab, onTabChange, onLogout, onProfileClick, unreadCount, tabs }: SidebarProps) {
  return (
    <aside className="w-64 bg-[#151619] text-white flex flex-col flex-shrink-0">
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 bg-[#5A5A40] rounded-lg flex items-center justify-center">
          <ClipboardList className="w-5 h-5" />
        </div>
        <span className="font-serif font-bold text-lg">Intersite Track</span>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1">
        {tabs.map((t, i) => (
          <motion.button
            key={t.key}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04, duration: 0.25 }}
            whileHover={{ x: 4 }}
            onClick={() => onTabChange(t.key)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left ${
              activeTab === t.key
                ? "bg-[#5A5A40] text-white shadow-lg shadow-[#5A5A40]/20"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            {t.icon}
            <span className="font-medium text-sm">{t.label}</span>
            {t.key === "notifications" && unreadCount > 0 && (
              <span className="ml-auto bg-rose-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </motion.button>
        ))}
      </nav>

      <div className="p-4 mt-auto border-t border-white/10">
        <button
          onClick={onProfileClick}
          className="flex items-center gap-3 mb-4 px-2 w-full hover:bg-white/5 rounded-lg py-2 transition-colors"
        >
          <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-sm font-bold">
            {user.first_name[0]}
          </div>
          <div className="overflow-hidden text-left">
            <p className="text-sm font-medium truncate">
              {user.first_name} {user.last_name}
            </p>
            <p className="text-xs text-gray-400">
              {user.role === "admin" ? "ผู้ดูแลระบบ" : "เจ้าหน้าที่"}
            </p>
          </div>
        </button>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
        >
          <LogOut size={18} /> ออกจากระบบ
        </button>
      </div>
    </aside>
  );
}
