import React from "react";
import { ClipboardList, LogOut, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
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
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ user, activeTab, onTabChange, onLogout, onProfileClick, unreadCount, tabs, isOpen, onClose }: SidebarProps) {
  const content = (
    <aside className="w-64 text-slate-900 flex flex-col h-full bg-white/92 backdrop-blur-xl border-r border-sky-100 shadow-[0_24px_60px_rgba(37,99,235,0.10)]">
      <div className="p-6 flex items-center gap-3">
        <div className="w-9 h-9 rounded-[1rem] flex items-center justify-center bg-gradient-to-br from-sky-400 via-blue-500 to-blue-700 text-white shadow-lg shadow-blue-500/25">
          <ClipboardList className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <span className="font-serif font-bold text-lg text-slate-900 leading-none">Intersite Track</span>
          <p className="text-[11px] uppercase tracking-[0.2em] text-sky-700/60 mt-1">Task Control</p>
        </div>
        <button
          onClick={onClose}
          className="md:hidden p-1 text-slate-400 hover:text-blue-600 transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      <nav className="flex-1 px-4 py-3 space-y-1.5 overflow-y-auto">
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
                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                : "text-slate-600 hover:text-blue-700 hover:bg-sky-50"
            }`}
          >
            {t.icon}
            <span className="font-medium text-sm">{t.label}</span>
            {t.key === "notifications" && unreadCount > 0 && (
              <span className="ml-auto bg-rose-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </motion.button>
        ))}
      </nav>

      <div className="p-4 mt-auto border-t border-sky-100 bg-gradient-to-b from-white to-sky-50/60">
        <button
          onClick={onProfileClick}
          className="flex items-center gap-3 mb-4 px-2 w-full hover:bg-sky-50 rounded-xl py-2 transition-colors"
        >
          <div className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center text-sm font-bold shrink-0 text-blue-700">
            {user.first_name?.[0] ?? user.username?.[0] ?? "?"}
          </div>
          <div className="overflow-hidden text-left">
            <p className="text-sm font-medium truncate text-slate-900">
              {user.first_name || user.username}
            </p>
            <p className="text-xs text-slate-500">
              {user.role === "admin" ? "ผู้ดูแลระบบ" : "เจ้าหน้าที่"}
            </p>
          </div>
        </button>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
        >
          <LogOut size={18} /> ออกจากระบบ
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop: always visible */}
      <div className="hidden md:flex flex-shrink-0">
        {content}
      </div>

      {/* Mobile: slide-in from left */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="mobile-sidebar"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "tween", duration: 0.25 }}
            className="fixed inset-y-0 left-0 z-50 md:hidden"
          >
            {content}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
