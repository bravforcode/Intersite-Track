import React, { useState, useEffect, useCallback } from "react";
import { LayoutDashboard, Users, ClipboardList, Bell, BarChart3, Database } from "lucide-react";
import { AnimatePresence } from "motion/react";

import { supabase } from "./lib/supabase";
import { authService } from "./services/authService";
import { taskService } from "./services/taskService";
import { userService } from "./services/userService";
import { notificationService } from "./services/notificationService";

import { LoginPage } from "./components/auth/LoginPage";
import { ProfileModal } from "./components/auth/ProfileModal";
import { MainLayout } from "./components/layout/MainLayout";
import { DashboardPage } from "./components/dashboard/DashboardPage";
import { TasksPage } from "./components/tasks/TasksPage";
import { TaskFormModal } from "./components/tasks/TaskFormModal";
import { TaskDetailModal } from "./components/tasks/TaskDetailModal";
import { StaffPage } from "./components/staff/StaffPage";
import { UserFormModal } from "./components/staff/UserFormModal";
import { ReportsPage } from "./components/reports/ReportsPage";
import { NotificationsPage } from "./components/notifications/NotificationsPage";
import { SettingsPage } from "./components/settings/SettingsPage";
import { ConfirmDialog } from "./components/common/ConfirmDialog";

import type { User, Task, Department, TaskType, Notification, Stats } from "./types";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState("dashboard");

  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [taskTypes, setTaskTypes] = useState<TaskType[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, completed: 0, inProgress: 0, pending: 0, cancelled: 0 });
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [userFormOpen, setUserFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{ message: string; onConfirm: () => void } | null>(null);

  useEffect(() => {
    // Initialize from Supabase session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        const saved = authService.getStoredUser();
        if (saved) setUser(saved);
      }
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session) {
        try {
          const profile = await authService.fetchProfile();
          setUser(profile);
        } catch {
          // Profile fetch failed — user may not exist in app DB yet
        }
      } else if (event === "SIGNED_OUT") {
        setUser(null);
        setActiveTab("dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    try {
      const [t, u, d, tt, s] = await Promise.all([
        taskService.getTasks(),
        userService.getUsers(),
        userService.getDepartments(),
        import("./services/taskTypeService").then((m) => m.taskTypeService.getTaskTypes()),
        taskService.getStats(),
      ]);
      setTasks(t); setUsers(u); setDepartments(d); setTaskTypes(tt); setStats(s);
    } catch {}
  }, [user]);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const [n, c] = await Promise.all([
        notificationService.getNotifications(user.id),
        notificationService.getUnreadCount(user.id),
      ]);
      setNotifications(n); setUnreadCount(c.count);
    } catch {}
  }, [user]);

  useEffect(() => { fetchAll(); fetchNotifications(); }, [fetchAll, fetchNotifications, activeTab]);

  useEffect(() => {
    if (!user) return;
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [user, fetchNotifications]);

  const handleLogin = (loggedInUser: User) => setUser(loggedInUser);

  const handleLogout = async () => {
    await authService.signOut();
    setUser(null);
    setActiveTab("dashboard");
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
        onNotificationClick={() => { setActiveTab("notifications"); fetchNotifications(); }}
        onCreateTask={() => { setEditingTask(null); setTaskFormOpen(true); }}
        onCreateUser={() => { setEditingUser(null); setUserFormOpen(true); }}
      >
        <AnimatePresence mode="wait">
          {activeTab === "dashboard" && (
            <React.Fragment key="dashboard">
              <DashboardPage stats={stats} tasks={tasks} users={users} user={user}
                onViewTask={setSelectedTask} onViewAll={() => setActiveTab("tasks")} />
            </React.Fragment>
          )}
          {activeTab === "tasks" && (
            <React.Fragment key="tasks">
              <TasksPage tasks={tasks} users={users} taskTypes={taskTypes} currentUser={user}
                onViewTask={setSelectedTask} onEditTask={(t) => { setEditingTask(t); setTaskFormOpen(true); }}
                onRefresh={fetchAll} />
            </React.Fragment>
          )}
          {activeTab === "staff" && (
            <React.Fragment key="staff">
              <StaffPage users={users} departments={departments} onEdit={(u) => { setEditingUser(u); setUserFormOpen(true); }}
                onDelete={(uid) => setConfirmDialog({ message: "ต้องการลบเจ้าหน้าที่นี้?", onConfirm: async () => { await userService.deleteUser(uid); fetchAll(); setConfirmDialog(null); } })} />
            </React.Fragment>
          )}
          {activeTab === "reports" && <React.Fragment key="reports"><ReportsPage stats={stats} /></React.Fragment>}
          {activeTab === "notifications" && (
            <React.Fragment key="notifications">
              <NotificationsPage notifications={notifications}
                onMarkRead={async (id) => { await notificationService.markRead(id); fetchNotifications(); }}
                onMarkAllRead={async () => { await notificationService.markAllRead(user.id); fetchNotifications(); }}
                onViewTask={async (refId) => { const t = await taskService.getTask(refId); setSelectedTask(t); }} />
            </React.Fragment>
          )}
          {activeTab === "settings" && (
            <React.Fragment key="settings">
              <SettingsPage departments={departments} taskTypes={taskTypes} users={users} onRefresh={fetchAll} />
            </React.Fragment>
          )}
        </AnimatePresence>
      </MainLayout>

      {taskFormOpen && (
        <TaskFormModal task={editingTask} users={users} taskTypes={taskTypes} currentUser={user}
          onClose={() => { setTaskFormOpen(false); setEditingTask(null); }}
          onSave={() => { setTaskFormOpen(false); setEditingTask(null); fetchAll(); }} />
      )}
      {selectedTask && (
        <TaskDetailModal task={selectedTask} user={user} taskTypes={taskTypes}
          onClose={() => setSelectedTask(null)}
          onUpdate={async () => { fetchAll(); fetchNotifications(); try { const t = await taskService.getTask(selectedTask.id); setSelectedTask(t); } catch {} }}
          onEdit={(t) => { setSelectedTask(null); setEditingTask(t); setTaskFormOpen(true); }} />
      )}
      {userFormOpen && (
        <UserFormModal user={editingUser} departments={departments}
          onClose={() => { setUserFormOpen(false); setEditingUser(null); }}
          onSave={() => { setUserFormOpen(false); setEditingUser(null); fetchAll(); }} />
      )}
      {profileOpen && (
        <ProfileModal user={user} onClose={() => setProfileOpen(false)}
          onSave={(updated) => { setUser(updated); localStorage.setItem("user", JSON.stringify(updated)); setProfileOpen(false); fetchAll(); }} />
      )}
      {confirmDialog && (
        <ConfirmDialog message={confirmDialog.message} onConfirm={confirmDialog.onConfirm} onCancel={() => setConfirmDialog(null)} />
      )}
    </>
  );
}
