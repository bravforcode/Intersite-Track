import { Suspense, lazy, useCallback, useEffect, useState, useRef } from "react";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Users, ClipboardList, Bell, BarChart3, Database, Briefcase, BarChartHorizontal, CalendarDays, CalendarCheck, Link2, CheckSquare, Target } from "lucide-react";

import { auth } from "./lib/firebase";
import { authService } from "./services/authService";
import { taskService } from "./services/taskService";
import { userService } from "./services/userService";
import { notificationService } from "./services/notificationService";
import { useNotificationSSE } from "./hooks/useNotificationSSE";
import { resolveAuthBootstrapDecision } from "./utils/authBootstrap";

import { LoginPage } from "./components/auth/LoginPage";
import { MainLayout } from "./components/layout/MainLayout";

import type { Notification, Task, User } from "./types";

const DashboardPage = lazy(() =>
  import("./components/dashboard/DashboardPage").then((module) => ({ default: module.DashboardPage }))
);
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
const ProjectsPage = lazy(() =>
  import("./components/projects/ProjectsPage").then((module) => ({ default: module.ProjectsPage }))
);
const WorkloadPage = lazy(() =>
  import("./components/dashboard/WorkloadPage").then((module) => ({ default: module.WorkloadPage }))
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
const HolidaysPage = lazy(() =>
  import("./components/holidays/HolidaysPage").then((m) => ({ default: m.HolidaysPage }))
);
const SaturdaySchedulePage = lazy(() =>
  import("./components/saturday/SaturdaySchedulePage").then((m) => ({ default: m.SaturdaySchedulePage }))
);
const LineLinkPage = lazy(() =>
  import("./components/line/LineLinkPage").then((m) => ({ default: m.LineLinkPage }))
);
const PendingApprovalsPage = lazy(() =>
  import("./components/approval/PendingApprovalsPage").then((m) => ({ default: m.PendingApprovalsPage }))
);
const KPIPage = lazy(() =>
  import("./components/kpi/KPIPage").then((m) => ({ default: m.KPIPage }))
);

function PageFallback() {
  return (
    <div className="app-surface rounded-4xl p-6 text-sm app-soft">
      กำลังโหลดเนื้อหา...
    </div>
  );
}

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const userRef = useRef<User | null>(null);
  const authBootstrapRef = useRef({
    initialAuthResolved: false,
    profileRequestInFlight: false,
  });
  
  const activeTab = location.pathname === "/" ? "dashboard" : location.pathname.substring(1);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [users, setUsers] = useState<User[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [sseToast, setSseToast] = useState<{ title: string; message: string } | null>(null);
  const sseToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [userFormOpen, setUserFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{ message: string; onConfirm: () => void } | null>(null);

  const triggerRefresh = useCallback(() => setRefreshTrigger((prev) => prev + 1), []);

  const updateCurrentUser = useCallback((nextUser: User) => {
    userRef.current = nextUser;
    setUser(nextUser);
    sessionStorage.setItem("user", JSON.stringify(nextUser));
  }, []);

  const refreshNotifications = useCallback(async () => {
    if (!user) return;

    const [newNotifications, unread] = await Promise.all([
      notificationService.getNotifications(user.id),
      notificationService.getUnreadCount(user.id),
    ]);
    setNotifications(newNotifications);
    setUnreadCount(unread.count);
  }, [user]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    const saved = authService.getStoredUser();
    if (saved) {
      userRef.current = saved;
      setUser(saved);
    }

    // Set up Firebase auth listener
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      const storedUser = authService.getStoredUser();
      const decision = resolveAuthBootstrapDecision({
        initialAuthResolved: authBootstrapRef.current.initialAuthResolved,
        hasFirebaseUser: !!currentUser,
        hasStoredUser: !!storedUser,
        hasInMemoryUser: !!userRef.current,
        profileRequestInFlight: authBootstrapRef.current.profileRequestInFlight,
      });

      authBootstrapRef.current.initialAuthResolved = true;

      if (decision === "clear-session") {
        userRef.current = null;
        setUser(null);
        navigate("/");
        return;
      }

      if (decision === "reuse-stored-user") {
        if (!userRef.current && storedUser) {
          userRef.current = storedUser;
          setUser(storedUser);
        }
        return;
      }

      if (decision === "fetch-profile") {
        authBootstrapRef.current.profileRequestInFlight = true;
        try {
          const profile = await authService.fetchProfile();
          userRef.current = profile;
          setUser(profile);
        } catch {
          // Ignore stale sessions that do not map to an app profile.
        } finally {
          authBootstrapRef.current.profileRequestInFlight = false;
        }
      }
    });

    return () => unsubscribe();
  }, [navigate]);


  useEffect(() => {
    if (!user) return;
    // SECURITY FIX (Task 1.3): Use appropriate endpoint based on user role
    // Admins: /api/users (full directory with all fields)
    // Staff: /api/users/task-context (limited to task-related users, no email/LINE_ID)
    const fetchUsers = user.role === "admin"
      ? userService.getUsers()
      : userService.getTaskContextUsers().then(users => users as User[]);

    fetchUsers.then(setUsers).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = notificationService.subscribeToNotifications(user.id, (newNotifications, count) => {
      setNotifications(newNotifications);
      setUnreadCount(count);
    });
    return () => unsubscribe();
  }, [user]);

  // ─── SSE real-time push ────────────────────────────────────────────────────
  const { latestNotification } = useNotificationSSE();
  useEffect(() => {
    if (!latestNotification || latestNotification.event !== "notification") return;
    void refreshNotifications();
    setSseToast({
      title: latestNotification.title ?? "แจ้งเตือนใหม่",
      message: latestNotification.message ?? "",
    });
    if (sseToastTimer.current) clearTimeout(sseToastTimer.current);
      sseToastTimer.current = setTimeout(() => setSseToast(null), 5000);
  }, [latestNotification, refreshNotifications]);

  const handleLogin = (loggedInUser: User) => {
    userRef.current = loggedInUser;
    setUser(loggedInUser);
  };

  const handleLogout = async () => {
    userRef.current = null;
    setUser(null);
    navigate("/");
    setNotifications([]);
    setUnreadCount(0);
    void authService.signOut();
  };

  if (!user) return <LoginPage onLogin={handleLogin} />;

  const tabs = [
    { key: "dashboard", label: "แดชบอร์ด", icon: <LayoutDashboard size={20} /> },
    { key: "projects", label: "จัดการโปรเจกต์", icon: <Briefcase size={20} /> },
    { key: "workload", label: "ภาระงานทีม", icon: <BarChartHorizontal size={20} /> },
    { key: "tasks", label: "จัดการงาน", icon: <ClipboardList size={20} /> },
    ...(user.role === "admin" ? [{ key: "staff", label: "พนักงาน", icon: <Users size={20} /> }] : []),
    ...(user.role === "admin" ? [{ key: "reports", label: "รายงาน", icon: <BarChart3 size={20} /> }] : []),
    { key: "notifications", label: "การแจ้งเตือน", icon: <Bell size={20} /> },
    { key: "kpi", label: "KPI & OKR", icon: <Target size={20} /> },
    { key: "approvals", label: "รออนุมัติ", icon: <CheckSquare size={20} /> },
    { key: "lineLink", label: "เชื่อม LINE", icon: <Link2 size={20} /> },
    { key: "holidays", label: "วันหยุด", icon: <CalendarDays size={20} /> },
    { key: "saturday", label: "เวรเสาร์", icon: <CalendarCheck size={20} /> },
    ...(user.role === "admin" ? [{ key: "settings", label: "ข้อมูลพื้นฐาน", icon: <Database size={20} /> }] : []),
  ];

  const tabTitles: Record<string, string> = {
    dashboard: "แดชบอร์ด", projects: "จัดการโปรเจกต์", workload: "ภาระงานทีม", tasks: "จัดการงาน", staff: "จัดการพนักงาน",
    reports: "รายงาน", notifications: "การแจ้งเตือน", approvals: "รออนุมัติ", kpi: "KPI & OKRs", lineLink: "เชื่อม LINE", holidays: "วันหยุดประจำปี", saturday: "ตารางเวรเสาร์", settings: "ข้อมูลพื้นฐาน",
  };

  return (
    <>
      <MainLayout
        user={user} activeTab={activeTab} tabs={tabs} tabTitles={tabTitles}
        unreadCount={unreadCount} onTabChange={(tab) => navigate(tab === "dashboard" ? "/" : `/${tab}`)} onLogout={handleLogout}
        onProfileClick={() => setProfileOpen(true)}
        onNotificationClick={() => { navigate("/notifications"); }}
        onCreateTask={() => { setEditingTask(null); setTaskFormOpen(true); }}
        onCreateUser={() => { setEditingUser(null); setUserFormOpen(true); }}
      >
        <Routes>
          <Route path="/" element={
            <Suspense fallback={<PageFallback />}>
              <DashboardPage
                user={user}
                onViewTask={setSelectedTask}
                onViewAll={() => navigate("/tasks")}
                refreshTrigger={refreshTrigger}
              />
            </Suspense>
          } />
          <Route path="/projects" element={
            <Suspense fallback={<PageFallback />}>
              <ProjectsPage onCreateTask={user.role === "admin" ? () => { setEditingTask(null); setTaskFormOpen(true); } : undefined} />
            </Suspense>
          } />
          <Route path="/workload" element={
            <Suspense fallback={<PageFallback />}>
              <WorkloadPage />
            </Suspense>
          } />
          <Route path="/tasks" element={
            <Suspense fallback={<PageFallback />}>
              <TasksPage
                currentUser={user}
                refreshTrigger={refreshTrigger}
                onViewTask={setSelectedTask}
                onEditTask={(t) => {
                  setEditingTask(t);
                  setTaskFormOpen(true);
                }}
              />
            </Suspense>
          } />
          {user.role === "admin" && (
            <Route path="/staff" element={
              <Suspense fallback={<PageFallback />}>
                <StaffPage
                  refreshTrigger={refreshTrigger}
                  onEdit={(u) => {
                    setEditingUser(u);
                    setUserFormOpen(true);
                  }}
                  onDelete={(uid) =>
                    setConfirmDialog({
                      message: "ต้องการลบพนักงานนี้?",
                      onConfirm: async () => {
                        await userService.deleteUser(uid);
                        triggerRefresh();
                        setConfirmDialog(null);
                      },
                    })
                  }
                />
              </Suspense>
            } />
          )}
          {user.role === "admin" && (
            <Route path="/reports" element={
              <Suspense fallback={<PageFallback />}>
                <ReportsPage user={user} refreshTrigger={refreshTrigger} />
              </Suspense>
            } />
          )}
          <Route path="/notifications" element={
            <Suspense fallback={<PageFallback />}>
              <NotificationsPage
                notifications={notifications}
                onMarkRead={async (id) => {
                  await notificationService.markRead(id);
                }}
                onMarkAllRead={async () => {
                  await notificationService.markAllRead(user.id);
                }}
                onViewTask={async (refId) => {
                  try {
                    const t = await taskService.getTask(refId);
                    setSelectedTask(t);
                  } catch (error) {
                    console.error("Failed to view task from notification", error);
                  }
                }}
              />
            </Suspense>
          } />
          <Route path="/kpi" element={
            <Suspense fallback={<PageFallback />}>
              <KPIPage user={user} />
            </Suspense>
          } />
          <Route path="/approvals" element={
            <Suspense fallback={<PageFallback />}>
              <PendingApprovalsPage currentUser={user} />
            </Suspense>
          } />
          <Route path="/lineLink" element={
            <Suspense fallback={<PageFallback />}>
              <LineLinkPage user={user} onUserUpdate={updateCurrentUser} />
            </Suspense>
          } />
          <Route path="/holidays" element={
            <Suspense fallback={<PageFallback />}>
              <HolidaysPage user={user} />
            </Suspense>
          } />
          <Route path="/saturday" element={
            <Suspense fallback={<PageFallback />}>
              <SaturdaySchedulePage user={user} users={users} />
            </Suspense>
          } />
          {user.role === "admin" && (
            <Route path="/settings" element={
              <Suspense fallback={<PageFallback />}>
                <SettingsPage refreshTrigger={refreshTrigger} />
              </Suspense>
            } />
          )}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
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
            onSave={(updated) => { updateCurrentUser(updated); setProfileOpen(false); triggerRefresh(); }}
            onOpenLineLink={() => { setProfileOpen(false); navigate("/lineLink"); }} />
        </Suspense>
      )}
      {confirmDialog && (
        <Suspense fallback={null}>
          <ConfirmDialog message={confirmDialog.message} onConfirm={confirmDialog.onConfirm} onCancel={() => setConfirmDialog(null)} />
        </Suspense>
      )}
      {/* ─── SSE Real-time Toast ───────────────────────────────────────── */}
      {sseToast && (
        <div
          className="app-toast"
          role="status"
          aria-live="polite"
        >
          <span className="app-toast-icon" aria-hidden="true">
            <Bell size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="m-0 text-sm font-bold app-heading">{sseToast.title}</p>
            {sseToast.message && (
              <p className="m-0 mt-1 text-[13px] leading-5 app-muted">
                {sseToast.message}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setSseToast(null)}
            className="app-toast-close"
            aria-label="ปิดการแจ้งเตือน"
          >
            ×
          </button>
        </div>
      )}
    </>
  );
}
