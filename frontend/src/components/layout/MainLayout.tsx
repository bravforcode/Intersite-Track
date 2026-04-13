import React, { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import type { User } from "../../types";

interface Tab {
  key: string;
  label: string;
  icon: React.ReactNode;
}

interface MainLayoutProps {
  user: User;
  activeTab: string;
  tabs: Tab[];
  tabTitles: Record<string, string>;
  unreadCount: number;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
  onProfileClick: () => void;
  onNotificationClick: () => void;
  onCreateTask: () => void;
  onCreateUser: () => void;
  children: React.ReactNode;
}

export function MainLayout({
  user,
  activeTab,
  tabs,
  tabTitles,
  unreadCount,
  onTabChange,
  onLogout,
  onProfileClick,
  onNotificationClick,
  onCreateTask,
  onCreateUser,
  children,
}: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleTabChange = (tab: string) => {
    onTabChange(tab);
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen app-shell flex transition-colors duration-300">
      {/* Mobile overlay backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar
        user={user}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onLogout={onLogout}
        onProfileClick={onProfileClick}
        unreadCount={unreadCount}
        tabs={tabs}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        <Header
          title={tabTitles[activeTab] || activeTab}
          user={user}
          activeTab={activeTab}
          unreadCount={unreadCount}
          onNotificationClick={onNotificationClick}
          onCreateTask={onCreateTask}
          onCreateUser={onCreateUser}
          onMenuToggle={() => setSidebarOpen((v) => !v)}
        />
        <div className="p-4 md:p-8 h-full overflow-y-auto app-heading">
          {children}
        </div>
      </main>
    </div>
  );
}
