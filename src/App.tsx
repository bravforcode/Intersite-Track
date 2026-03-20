import React, { Suspense, lazy, useCallback, useEffect, useState } from "react";
import { LayoutDashboard, Users, ClipboardList, Bell, BarChart3, Database } from "lucide-react";
import { AnimatePresence } from "motion/react";

import { supabase } from "./lib/supabase";
import { authService } from "./services/authService";
import { taskService } from "./services/taskService";
import { userService } from "./services/userService";
import { notificationService } from "./services/notificationService";

import { LoginPage } from "./components/auth/LoginPage";
import { MainLayout } from "./components/layout/MainLayout";
import { DashboardPage } from "./components/dashboard/DashboardPage";

import type { Notification, Task, User } from "./types";

const TasksPage = lazy(() =>
  import("./components/tasks/TasksPage").then((module) => ({ default: module.TasksPage }))
);
const TaskFormModal = lazy(() =>
  import("./components/tasks/TaskFormModal").then((module) => ({ default: module.TaskFormModal }))
);
const TaskDetailModal = lazy(() =>
  import("./components/tasks/TaskDetailModal").then((module) => ({ default: module.TaskDetailModal }))
);
const StaffPage = lazy(() =>
  import("./components/staff/StaffPage").then((module) => ({ default: module.StaffPage }))
);
const UserFormModal = lazy(() =>
  import("./components/staff/UserFormModal").then((module) => ({ default: module.UserFormModal }))
);
const ReportsPage = lazy(() =>
  import("./components/reports/ReportsPage").then((module) => ({ default: module.ReportsPage }))
);
const NotificationsPage = lazy(() =>
  import("./components/notifications/NotificationsPage").then((module) => ({ default: module.NotificationsPage }))
);
const SettingsPage = lazy(() =>
  import("./components/settings/SettingsPage").then((module) => ({ default: module.SettingsPage }))
);
const ProfileModal = lazy(() =>
  import("./components/auth/ProfileModal").then((module) => ({ default: module.ProfileModal }))
);
const ConfirmDialog = lazy(() =>
  import("./components/common/ConfirmDialog").then((module) => ({ default: module.ConfirmDialog }))
);

function PageFallback() {
  return (
    <div className="app-surface rounded-[2rem] p-6 text-sm app-soft">
      กำลังโหลดเนื้อหา...
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [userFormOpen, setUserFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{ message: string; onConfirm: () => void } | null>(null);

  const triggerRefresh = useCallback(() => setRefreshTrigger((prev) => prev + 1), []);

  useEffect(() => {
    const saved = authService.getStoredUser();
    if (saved) {
      setUser(saved);
    } else {
      void supabase.auth.getSession().then(async ({ data }) => {
        if (!data.session) return;

        try {
          const profile = await authService.fetchProfile();
          setUser(profile);
        } catch {
          // Ignore stale sessions that do not map to an app profile.
        }
      });
    }

    // Do not make async Supabase calls inside this callback.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setUser(null);
        setActiveTab("dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, []);


  const fetchUnreadCount = useCallback(async () => {
    if (!user) return;
    try {
      const { count } = await notificationService.getUnreadCount(user.id);
      setUnreadCount(count);
    } catch {}
  }, [user]);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const items = await notificationService.getNotifications(user.id);
      setNotifications(items);
    } catch {}
  }, [user]);

  useEffect(() => {
    void fetchUnreadCount();
  }, [fetchUnreadCount, refreshTrigger]);

  useEffect(() => {
    if (activeTab !== "notifications") return;
    void fetchNotifications();
  }, [activeTab, fetchNotifications, refreshTrigger]);

  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      void fetchUnreadCount();
      if (activeTab === "notifications") {
        void fetchNotifications();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [activeTab, fetchNotifications, fetchUnreadCount, user]);

  const handleLogin = (loggedInUser: User) => setUser(loggedInUser);

  const handleLogout = async () => {
    setUser(null);
    setActiveTab("dashboard");
    setNotifications([]);
    setUnreadCount(0);
    void authService.signOut();
  };

  if (!user) return <LoginPage onLogin={handleLogin} />;

  const tabs = [
    { key: "dashboard", label: "แดชบอร์ด", icon: <LayoutDashboard size={20} /> },
    { key: "tasks", label: "จัดการงาน", icon: <ClipboardList size={20} /> },
    ...(user.role === "admin" ? [{ key: "staff", label: "เจ้าหน้าที่", icon: <Users size={20} /> }] : []),
    { key: "reports", label: "รายงาน", icon: <BarChart3 size={20} /> },
    { key: "notifications", label: "การแจ้งเตือน", icon: <Bell size={20} /> },
    ...(user.role === "admin" ? [{ key: "settings", label: "ข้อมูลพื้นฐาน", icon: <Database size={20} /> }] : []),
  ];

  const tabTitles: Record<string, string> = {
    dashboard: "แดชบอร์ด", tasks: "จัดการงาน", staff: "จัดการเจ้าหน้าที่",
    reports: "รายงาน", notifications: "การแจ้งเตือน", settings: "ข้อมูลพื้นฐาน",
  };

  return (
    <>
      <MainLayout
        user={user} activeTab={activeTab} tabs={tabs} tabTitles={tabTitles}
        unreadCount={unreadCount} onTabChange={setActiveTab} onLogout={handleLogout}
        onProfileClick={() => setProfileOpen(true)}
        onNotificationClick={() => { setActiveTab("notifications"); void fetchNotifications(); }}
        onCreateTask={() => { setEditingTask(null); setTaskFormOpen(true); }}
        onCreateUser={() => { setEditingUser(null); setUserFormOpen(true); }}
      >
        <AnimatePresence mode="wait">
          {activeTab === "dashboard" && (
            <React.Fragment key="dashboard">
              <DashboardPage user={user}
                onViewTask={setSelectedTask} onViewAll={() => setActiveTab("tasks")} refreshTrigger={refreshTrigger} />
            </React.Fragment>
          )}
          {activeTab === "tasks" && (
            <React.Fragment key="tasks">
              <Suspense fallback={<PageFallback />}>
                <TasksPage currentUser={user} refreshTrigger={refreshTrigger}
                  onViewTask={setSelectedTask} onEditTask={(t) => { setEditingTask(t); setTaskFormOpen(true); }} />
              </Suspense>
            </React.Fragment>
          )}
          {activeTab === "staff" && (
            <React.Fragment key="staff">
              <Suspense fallback={<PageFallback />}>
                <StaffPage refreshTrigger={refreshTrigger} onEdit={(u) => { setEditingUser(u); setUserFormOpen(true); }}
                  onDelete={(uid) => setConfirmDialog({ message: "ต้องการลบเจ้าหน้าที่นี้?", onConfirm: async () => { await userService.deleteUser(uid); triggerRefresh(); setConfirmDialog(null); } })} />
              </Suspense>
            </React.Fragment>
          )}
          {activeTab === "reports" && (
            <React.Fragment key="reports">
              <Suspense fallback={<PageFallback />}>
                <ReportsPage refreshTrigger={refreshTrigger} />
              </Suspense>
            </React.Fragment>
          )}
          {activeTab === "notifications" && (
            <React.Fragment key="notifications">
              <Suspense fallback={<PageFallback />}>
                <NotificationsPage notifications={notifications}
                  onMarkRead={async (id) => {
                    await notificationService.markRead(id);
                    await Promise.all([fetchNotifications(), fetchUnreadCount()]);
                  }}
                  onMarkAllRead={async () => {
                    await notificationService.markAllRead(user.id);
                    await Promise.all([fetchNotifications(), fetchUnreadCount()]);
                  }}
                  onViewTask={async (refId) => { const t = await taskService.getTask(refId); setSelectedTask(t); }} />
              </Suspense>
            </React.Fragment>
          )}
          {activeTab === "settings" && (
            <React.Fragment key="settings">
              <Suspense fallback={<PageFallback />}>
                <SettingsPage refreshTrigger={refreshTrigger} />
              </Suspense>
            </React.Fragment>
          )}
        </AnimatePresence>
      </MainLayout>

      {taskFormOpen && (
        <Suspense fallback={null}>
          <TaskFormModal task={editingTask} currentUser={user}
            onClose={() => { setTaskFormOpen(false); setEditingTask(null); }}
            onSave={() => { setTaskFormOpen(false); setEditingTask(null); triggerRefresh(); }} />
        </Suspense>
      )}
      {selectedTask && (
        <Suspense fallback={null}>
          <TaskDetailModal task={selectedTask} user={user}
            onClose={() => setSelectedTask(null)}
            onUpdate={async () => {
              triggerRefresh();
              await fetchUnreadCount();
              if (activeTab === "notifications") {
                await fetchNotifications();
              }
              try {
                const t = await taskService.getTask(selectedTask.id);
                setSelectedTask(t);
              } catch {}
            }}
            onEdit={(t) => { setSelectedTask(null); setEditingTask(t); setTaskFormOpen(true); }} />
        </Suspense>
      )}
      {userFormOpen && (
        <Suspense fallback={null}>
          <UserFormModal user={editingUser}
            onClose={() => { setUserFormOpen(false); setEditingUser(null); }}
            onSave={() => { setUserFormOpen(false); setEditingUser(null); triggerRefresh(); }} />
        </Suspense>
      )}
      {profileOpen && (
        <Suspense fallback={null}>
          <ProfileModal user={user} onClose={() => setProfileOpen(false)}
            onSave={(updated) => { setUser(updated); localStorage.setItem("user", JSON.stringify(updated)); setProfileOpen(false); triggerRefresh(); }} />
        </Suspense>
      )}
      {confirmDialog && (
        <Suspense fallback={null}>
          <ConfirmDialog message={confirmDialog.message} onConfirm={confirmDialog.onConfirm} onCancel={() => setConfirmDialog(null)} />
        </Suspense>
      )}
    </>
  );
}
