import React from "react";
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
  return (
    <div className="min-h-screen bg-[#F5F5F0] flex">
      <Sidebar
        user={user}
        activeTab={activeTab}
        onTabChange={onTabChange}
        onLogout={onLogout}
        onProfileClick={onProfileClick}
        unreadCount={unreadCount}
        tabs={tabs}
      />
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <Header
          title={tabTitles[activeTab] || activeTab}
          user={user}
          activeTab={activeTab}
          unreadCount={unreadCount}
          onNotificationClick={onNotificationClick}
          onCreateTask={onCreateTask}
          onCreateUser={onCreateUser}
        />
        <div className="flex-1 overflow-y-auto p-8">{children}</div>
      </main>
    </div>
  );
}
