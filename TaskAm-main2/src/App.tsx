import React, { useState, useEffect, useCallback } from "react";
import {
  LayoutDashboard, Users, ClipboardList, Bell, BarChart3, Settings, LogOut, Plus,
  Search, Filter, CheckCircle2, Clock, AlertCircle, ChevronRight, User as UserIcon,
  Calendar, FileText, Trash2, Edit3, Eye, X, Download, Database, Tag,
  TrendingUp, AlertTriangle, CheckCheck, XCircle, ListChecks, Square, CheckSquare, CornerDownRight, ImagePlus
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// ============================================
// TYPES
// ============================================
type User = {
  id: number; username: string; first_name: string; last_name: string;
  role: "admin" | "staff"; department_id: number; department_name?: string; position: string;
};
type Task = {
  id: number; title: string; description: string; task_type_id: number; task_type_name?: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: "pending" | "in_progress" | "completed" | "cancelled";
  due_date: string; progress: number; created_at: string; creator_name: string;
  assignments: { id: number; first_name: string; last_name: string }[];
};
type TaskUpdate = {
  id: number; task_id: number; user_id: number; update_text: string;
  progress: number; attachment_url?: string; created_at: string; first_name: string; last_name: string;
};
type Department = { id: number; name: string };
type TaskType = { id: number; name: string };
type Notification = {
  id: number; user_id: number; title: string; message: string;
  type: string; reference_id: number; is_read: number; created_at: string;
};
type Stats = { total: number; completed: number; inProgress: number; pending: number; cancelled: number };
type StaffReport = {
  id: number; first_name: string; last_name: string; position: string;
  department_name: string; total_tasks: number; completed: number; in_progress: number; pending: number;
};
type ChecklistChild = { title: string; is_checked: boolean; sort_order: number };
type ChecklistItem = { title: string; is_checked: boolean; sort_order: number; children: ChecklistChild[] };

// ============================================
// HELPER FUNCTIONS
// ============================================
const api = async (url: string, options?: RequestInit) => {
  const res = await fetch(url, { headers: { "Content-Type": "application/json" }, ...options });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "เกิดข้อผิดพลาด" }));
    throw new Error(err.error || "เกิดข้อผิดพลาด");
  }
  return res.json();
};

const priorityLabel: Record<string, string> = { low: "ต่ำ", medium: "ปานกลาง", high: "สูง", urgent: "เร่งด่วน" };
const statusLabel: Record<string, string> = { pending: "รอดำเนินการ", in_progress: "กำลังดำเนินการ", completed: "เสร็จสิ้น", cancelled: "ยกเลิก" };
const priorityColor: Record<string, string> = { low: "bg-green-100 text-green-700", medium: "bg-blue-100 text-blue-700", high: "bg-orange-100 text-orange-700", urgent: "bg-rose-100 text-rose-700" };
const statusColor: Record<string, string> = { pending: "bg-gray-100 text-gray-700", in_progress: "bg-amber-100 text-amber-700", completed: "bg-emerald-100 text-emerald-700", cancelled: "bg-red-100 text-red-700" };
const statusDot: Record<string, string> = { pending: "bg-gray-400", in_progress: "bg-amber-500", completed: "bg-emerald-500", cancelled: "bg-red-500" };

function formatDate(d: string) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" });
}
function formatDateTime(d: string) {
  if (!d) return "-";
  return new Date(d).toLocaleString("th-TH", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

// ============================================
// MAIN APP
// ============================================
export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [loginError, setLoginError] = useState("");

  // Global data
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [taskTypes, setTaskTypes] = useState<TaskType[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, completed: 0, inProgress: 0, pending: 0, cancelled: 0 });
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Modals
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [userFormOpen, setUserFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{ message: string; onConfirm: () => void } | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("user");
    if (saved) setUser(JSON.parse(saved));
  }, []);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    try {
      const [t, u, d, tt, s] = await Promise.all([
        api("/api/tasks"), api("/api/users"), api("/api/departments"),
        api("/api/task-types"), api("/api/stats"),
      ]);
      setTasks(t); setUsers(u); setDepartments(d); setTaskTypes(tt); setStats(s);
    } catch {}
  }, [user]);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const [n, c] = await Promise.all([
        api(`/api/notifications/${user.id}`),
        api(`/api/notifications/${user.id}/unread-count`),
      ]);
      setNotifications(n); setUnreadCount(c.count);
    } catch {}
  }, [user]);

  useEffect(() => { fetchAll(); fetchNotifications(); }, [fetchAll, fetchNotifications, activeTab]);

  // Auto-refresh notifications every 30s
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [user, fetchNotifications]);

  const handleLogin = async (username: string, password: string) => {
    try {
      setLoginError("");
      const data = await api("/api/login", { method: "POST", body: JSON.stringify({ username, password }) });
      setUser(data);
      localStorage.setItem("user", JSON.stringify(data));
    } catch (e: any) {
      setLoginError(e.message);
    }
  };

  const handleLogout = () => { setUser(null); localStorage.removeItem("user"); setActiveTab("dashboard"); };

  // ============================================
  // LOGIN PAGE
  // ============================================
  if (!user) {
    return (
      <div className="min-h-screen bg-[#F5F5F0] flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md border border-black/5">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-[#5A5A40] rounded-2xl flex items-center justify-center mb-4 shadow-lg">
              <ClipboardList className="text-white w-8 h-8" />
            </div>
            <h1 className="text-2xl font-serif font-bold text-[#1a1a1a]">ระบบบริหารจัดการงาน</h1>
            <p className="text-gray-500 text-sm">เจ้าหน้าที่ — Staff Task Management</p>
          </div>
          {loginError && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl mb-4 text-center">{loginError}</div>}
          <form onSubmit={e => { e.preventDefault(); handleLogin(loginForm.username, loginForm.password); }} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1 ml-1">ชื่อผู้ใช้</label>
              <input type="text" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] focus:border-transparent outline-none transition-all" placeholder="กรอกชื่อผู้ใช้" value={loginForm.username} onChange={e => setLoginForm({ ...loginForm, username: e.target.value })} required />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1 ml-1">รหัสผ่าน</label>
              <input type="password" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] focus:border-transparent outline-none transition-all" placeholder="กรอกรหัสผ่าน" value={loginForm.password} onChange={e => setLoginForm({ ...loginForm, password: e.target.value })} required />
            </div>
            <button type="submit" className="w-full bg-[#5A5A40] text-white py-3 rounded-xl font-semibold shadow-lg hover:bg-[#4A4A30] transition-colors mt-4">เข้าสู่ระบบ</button>
          </form>
          <div className="mt-6 p-4 bg-gray-50 rounded-2xl border border-gray-100">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2 text-center">ทดสอบเข้าสู่ระบบ (คลิกเพื่อเข้า)</p>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <button type="button" onClick={() => handleLogin("admin", "admin123")} className="text-center p-2 rounded-xl hover:bg-white hover:shadow-sm transition-all border border-transparent hover:border-gray-100 group">
                <p className="font-bold text-[#5A5A40]">ผู้ดูแลระบบ</p>
                <p className="text-gray-400">admin / admin123</p>
              </button>
              <button type="button" onClick={() => handleLogin("somchai", "staff123")} className="text-center p-2 rounded-xl hover:bg-white hover:shadow-sm transition-all border border-transparent hover:border-gray-100 group">
                <p className="font-bold text-[#5A5A40]">เจ้าหน้าที่</p>
                <p className="text-gray-400">somchai / staff123</p>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // ============================================
  // MAIN LAYOUT
  // ============================================
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
    <div className="min-h-screen bg-[#F5F5F0] flex">
      {/* Sidebar */}
      <aside className="w-64 bg-[#151619] text-white flex flex-col flex-shrink-0">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-[#5A5A40] rounded-lg flex items-center justify-center">
            <ClipboardList className="w-5 h-5" />
          </div>
          <span className="font-serif font-bold text-lg">TaskAm</span>
        </div>
        <nav className="flex-1 px-4 py-4 space-y-1">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left ${
                activeTab === t.key ? "bg-[#5A5A40] text-white shadow-lg shadow-[#5A5A40]/20" : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}>
              {t.icon}
              <span className="font-medium text-sm">{t.label}</span>
              {t.key === "notifications" && unreadCount > 0 && (
                <span className="ml-auto bg-rose-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">{unreadCount}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="p-4 mt-auto border-t border-white/10">
          <button onClick={() => setProfileOpen(true)} className="flex items-center gap-3 mb-4 px-2 w-full hover:bg-white/5 rounded-lg py-2 transition-colors">
            <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-sm font-bold">{user.first_name[0]}</div>
            <div className="overflow-hidden text-left">
              <p className="text-sm font-medium truncate">{user.first_name} {user.last_name}</p>
              <p className="text-xs text-gray-400">{user.role === "admin" ? "ผู้ดูแลระบบ" : "เจ้าหน้าที่"}</p>
            </div>
          </button>
          <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-400/10 rounded-lg transition-colors">
            <LogOut size={18} /> ออกจากระบบ
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-white border-b border-black/5 flex items-center justify-between px-8 flex-shrink-0">
          <h2 className="text-xl font-serif font-bold text-[#1a1a1a]">{tabTitles[activeTab]}</h2>
          <div className="flex items-center gap-4">
            <button onClick={() => { setActiveTab("notifications"); fetchNotifications(); }} className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors">
              <Bell size={20} />
              {unreadCount > 0 && <span className="absolute -top-0.5 -right-0.5 bg-rose-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">{unreadCount}</span>}
            </button>
            {user.role === "admin" && activeTab === "tasks" && (
              <button onClick={() => { setEditingTask(null); setTaskFormOpen(true); }} className="bg-[#5A5A40] text-white px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 shadow-md hover:bg-[#4A4A30] transition-colors">
                <Plus size={18} /> สร้างงานใหม่
              </button>
            )}
            {user.role === "admin" && activeTab === "staff" && (
              <button onClick={() => { setEditingUser(null); setUserFormOpen(true); }} className="bg-[#5A5A40] text-white px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 shadow-md hover:bg-[#4A4A30] transition-colors">
                <Plus size={18} /> เพิ่มเจ้าหน้าที่
              </button>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          <AnimatePresence mode="wait">
            {activeTab === "dashboard" && <React.Fragment key="d"><DashboardPage stats={stats} tasks={tasks} users={users} user={user} onViewTask={setSelectedTask} onViewAll={() => setActiveTab("tasks")} /></React.Fragment>}
            {activeTab === "tasks" && <React.Fragment key="t"><TasksPage tasks={tasks} users={users} taskTypes={taskTypes} currentUser={user} onViewTask={setSelectedTask} onEditTask={t => { setEditingTask(t); setTaskFormOpen(true); }} onRefresh={fetchAll} /></React.Fragment>}
            {activeTab === "staff" && <React.Fragment key="s"><StaffPage users={users} departments={departments} onEdit={u => { setEditingUser(u); setUserFormOpen(true); }} onDelete={uid => setConfirmDialog({ message: "ต้องการลบเจ้าหน้าที่นี้?", onConfirm: async () => { await api(`/api/users/${uid}`, { method: "DELETE" }); fetchAll(); setConfirmDialog(null); } })} /></React.Fragment>}
            {activeTab === "reports" && <React.Fragment key="r"><ReportsPage stats={stats} /></React.Fragment>}
            {activeTab === "notifications" && <React.Fragment key="n"><NotificationsPage notifications={notifications} onMarkRead={async id => { await api(`/api/notifications/${id}/read`, { method: "PATCH" }); fetchNotifications(); }} onMarkAllRead={async () => { await api(`/api/notifications/read-all/${user.id}`, { method: "PATCH" }); fetchNotifications(); }} onViewTask={async refId => { const t = await api(`/api/tasks/${refId}`); setSelectedTask(t); }} /></React.Fragment>}
            {activeTab === "settings" && <React.Fragment key="st"><SettingsPage departments={departments} taskTypes={taskTypes} onRefresh={fetchAll} /></React.Fragment>}
          </AnimatePresence>
        </div>
      </main>

      {/* Modals */}
      {taskFormOpen && (
        <TaskFormModal task={editingTask} users={users} taskTypes={taskTypes} currentUser={user}
          onClose={() => { setTaskFormOpen(false); setEditingTask(null); }}
          onSave={() => { setTaskFormOpen(false); setEditingTask(null); fetchAll(); }} />
      )}
      {selectedTask && (
        <TaskDetailModal task={selectedTask} user={user} taskTypes={taskTypes}
          onClose={() => setSelectedTask(null)} onUpdate={async () => { fetchAll(); fetchNotifications(); try { const t = await api(`/api/tasks/${selectedTask.id}`); setSelectedTask(t); } catch {} }}
          onEdit={t => { setSelectedTask(null); setEditingTask(t); setTaskFormOpen(true); }} />
      )}
      {userFormOpen && (
        <UserFormModal user={editingUser} departments={departments}
          onClose={() => { setUserFormOpen(false); setEditingUser(null); }}
          onSave={() => { setUserFormOpen(false); setEditingUser(null); fetchAll(); }} />
      )}
      {profileOpen && (
        <ProfileModal user={user} departments={departments}
          onClose={() => setProfileOpen(false)}
          onSave={updated => { setUser(updated); localStorage.setItem("user", JSON.stringify(updated)); setProfileOpen(false); fetchAll(); }} />
      )}
      {confirmDialog && (
        <ConfirmDialog message={confirmDialog.message} onConfirm={confirmDialog.onConfirm} onCancel={() => setConfirmDialog(null)} />
      )}
    </div>
  );
}

// ============================================
// DASHBOARD PAGE
// ============================================
function DashboardPage({ stats, tasks, users, user, onViewTask, onViewAll }: {
  stats: Stats; tasks: Task[]; users: User[]; user: User;
  onViewTask: (t: Task) => void; onViewAll: () => void;
}) {
  const myTasks = user.role === "staff" ? tasks.filter(t => t.assignments.some(a => a.id === user.id)) : tasks;
  const upcomingTasks = myTasks.filter(t => t.status !== "completed" && t.status !== "cancelled" && t.due_date)
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()).slice(0, 5);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="งานทั้งหมด" value={stats.total} icon={<ClipboardList className="text-blue-500" />} bg="bg-blue-50" />
        <StatCard title="กำลังดำเนินการ" value={stats.inProgress} icon={<Clock className="text-amber-500" />} bg="bg-amber-50" />
        <StatCard title="รอดำเนินการ" value={stats.pending} icon={<AlertCircle className="text-orange-500" />} bg="bg-orange-50" />
        <StatCard title="เสร็จสิ้น" value={stats.completed} icon={<CheckCircle2 className="text-emerald-500" />} bg="bg-emerald-50" />
        <StatCard title="ยกเลิก" value={stats.cancelled} icon={<XCircle className="text-rose-500" />} bg="bg-rose-50" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Tasks */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-sm border border-black/5">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-serif font-bold">งานล่าสุด</h3>
            <button onClick={onViewAll} className="text-sm text-[#5A5A40] font-medium hover:underline">ดูทั้งหมด</button>
          </div>
          <div className="space-y-3">
            {myTasks.slice(0, 6).map(task => (
              <div key={task.id} onClick={() => onViewTask(task)} className="flex items-center justify-between p-4 rounded-2xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100 cursor-pointer group">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${task.status === "completed" ? "bg-emerald-100 text-emerald-600" : task.status === "in_progress" ? "bg-amber-100 text-amber-600" : "bg-gray-100 text-gray-600"}`}>
                    {task.status === "completed" ? <CheckCircle2 size={20} /> : <Clock size={20} />}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{task.title}</p>
                    <p className="text-xs text-gray-500">กำหนดส่ง: {formatDate(task.due_date)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-md ${priorityColor[task.priority]}`}>{priorityLabel[task.priority]}</span>
                  <ChevronRight size={18} className="text-gray-300 group-hover:text-gray-500" />
                </div>
              </div>
            ))}
            {myTasks.length === 0 && <p className="text-center text-gray-400 py-8">ยังไม่มีงาน</p>}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Upcoming Deadlines */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-black/5">
            <h3 className="text-lg font-serif font-bold mb-4 flex items-center gap-2"><AlertTriangle size={18} className="text-amber-500" /> งานใกล้ครบกำหนด</h3>
            <div className="space-y-3">
              {upcomingTasks.map(t => {
                const daysLeft = Math.ceil((new Date(t.due_date).getTime() - Date.now()) / 86400000);
                return (
                  <div key={t.id} onClick={() => onViewTask(t)} className="p-3 rounded-xl border border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors">
                    <p className="font-medium text-sm text-gray-900 truncate">{t.title}</p>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-xs text-gray-400">{formatDate(t.due_date)}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${daysLeft <= 1 ? "bg-rose-100 text-rose-600" : daysLeft <= 3 ? "bg-amber-100 text-amber-600" : "bg-blue-100 text-blue-600"}`}>
                        {daysLeft <= 0 ? "เลยกำหนด!" : `อีก ${daysLeft} วัน`}
                      </span>
                    </div>
                  </div>
                );
              })}
              {upcomingTasks.length === 0 && <p className="text-center text-gray-400 py-4 text-sm">ไม่มีงานใกล้ครบกำหนด</p>}
            </div>
          </div>

          {/* Staff Overview */}
          {user.role === "admin" && (
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-black/5">
              <h3 className="text-lg font-serif font-bold mb-4">เจ้าหน้าที่</h3>
              <div className="space-y-4">
                {users.filter(u => u.role === "staff").slice(0, 5).map(u => (
                  <div key={u.id} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#F5F5F0] flex items-center justify-center text-[#5A5A40] font-bold text-sm">{u.first_name[0]}{u.last_name[0]}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{u.first_name} {u.last_name}</p>
                      <p className="text-xs text-gray-400">{u.position}</p>
                    </div>
                    <span className="text-xs font-medium text-[#5A5A40] bg-[#F5F5F0] px-2 py-1 rounded-lg">{u.department_name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ============================================
// TASKS PAGE
// ============================================
function TasksPage({ tasks, users, taskTypes, currentUser, onViewTask, onEditTask, onRefresh }: {
  tasks: Task[]; users: User[]; taskTypes: TaskType[]; currentUser: User;
  onViewTask: (t: Task) => void; onEditTask: (t: Task) => void; onRefresh: () => void;
}) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterAssignee, setFilterAssignee] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const myTasks = currentUser.role === "staff" ? tasks.filter(t => t.assignments.some(a => a.id === currentUser.id)) : tasks;
  const filtered = myTasks.filter(t => {
    if (search && !t.title.toLowerCase().includes(search.toLowerCase()) && !(t.description || "").toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus && t.status !== filterStatus) return false;
    if (filterPriority && t.priority !== filterPriority) return false;
    if (filterAssignee && !t.assignments.some(a => a.id === Number(filterAssignee))) return false;
    if (filterDateFrom && t.due_date < filterDateFrom) return false;
    if (filterDateTo && t.due_date > filterDateTo) return false;
    return true;
  });

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="space-y-6">
      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-black/5 space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input type="text" placeholder="ค้นหางาน..." className="w-full pl-10 pr-4 py-2 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-[#5A5A40] outline-none text-sm"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${showFilters ? "bg-[#5A5A40] text-white" : "bg-gray-50 text-gray-600 hover:bg-gray-100"}`}>
              <Filter size={18} /> ตัวกรอง
            </button>
            <select className="px-4 py-2 bg-gray-50 rounded-xl text-sm font-medium text-gray-600 border-none focus:ring-2 focus:ring-[#5A5A40] outline-none"
              value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">สถานะทั้งหมด</option>
              <option value="pending">รอดำเนินการ</option>
              <option value="in_progress">กำลังดำเนินการ</option>
              <option value="completed">เสร็จสิ้น</option>
              <option value="cancelled">ยกเลิก</option>
            </select>
            <select className="px-4 py-2 bg-gray-50 rounded-xl text-sm font-medium text-gray-600 border-none focus:ring-2 focus:ring-[#5A5A40] outline-none"
              value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
              <option value="">ความสำคัญทั้งหมด</option>
              <option value="low">ต่ำ</option>
              <option value="medium">ปานกลาง</option>
              <option value="high">สูง</option>
              <option value="urgent">เร่งด่วน</option>
            </select>
          </div>
        </div>
        {showFilters && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-100">
            <div>
              <label className="block text-xs font-bold uppercase text-gray-400 mb-1">ผู้รับผิดชอบ</label>
              <select className="w-full px-4 py-2 bg-gray-50 rounded-xl text-sm border-none focus:ring-2 focus:ring-[#5A5A40] outline-none"
                value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)}>
                <option value="">ทั้งหมด</option>
                {users.filter(u => u.role === "staff").map(u => <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-gray-400 mb-1">จากวันที่</label>
              <input type="date" className="w-full px-4 py-2 bg-gray-50 rounded-xl text-sm border-none focus:ring-2 focus:ring-[#5A5A40] outline-none" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-gray-400 mb-1">ถึงวันที่</label>
              <input type="date" className="w-full px-4 py-2 bg-gray-50 rounded-xl text-sm border-none focus:ring-2 focus:ring-[#5A5A40] outline-none" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} />
            </div>
          </motion.div>
        )}
      </div>

      {/* Results count */}
      <p className="text-sm text-gray-400">แสดง {filtered.length} จาก {myTasks.length} งาน</p>

      {/* Task Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filtered.map(task => (
          <React.Fragment key={task.id}><TaskCard task={task} onClick={() => onViewTask(task)}
            onEdit={currentUser.role === "admin" ? () => onEditTask(task) : undefined} /></React.Fragment>
        ))}
      </div>
      {filtered.length === 0 && <div className="text-center py-16 text-gray-400"><ClipboardList size={48} className="mx-auto mb-4 opacity-50" /><p>ไม่พบงานที่ตรงตามเงื่อนไข</p></div>}
    </motion.div>
  );
}

// ============================================
// STAFF PAGE
// ============================================
function StaffPage({ users, departments, onEdit, onDelete }: {
  users: User[]; departments: Department[];
  onEdit: (u: User) => void; onDelete: (id: number) => void;
}) {
  const [search, setSearch] = useState("");
  const [staffTasks, setStaffTasks] = useState<Record<number, Task[]>>({});
  const [viewingStaff, setViewingStaff] = useState<User | null>(null);

  const staffUsers = users.filter(u => {
    if (search && !`${u.first_name} ${u.last_name} ${u.username} ${u.position}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const loadStaffTasks = async (userId: number) => {
    const tasks = await api(`/api/users/${userId}/tasks`);
    setStaffTasks(prev => ({ ...prev, [userId]: tasks }));
  };

  return (
    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="space-y-6">
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-black/5">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input type="text" placeholder="ค้นหาเจ้าหน้าที่..." className="w-full pl-10 pr-4 py-2 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-[#5A5A40] outline-none text-sm"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-black/5 overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">เจ้าหน้าที่</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">ตำแหน่ง</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">หน่วยงาน</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">บทบาท</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 text-right">การจัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {staffUsers.map(u => (
              <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#F5F5F0] flex items-center justify-center text-[#5A5A40] font-bold text-sm">{u.first_name[0]}{u.last_name[0]}</div>
                    <div>
                      <p className="font-medium text-gray-900">{u.first_name} {u.last_name}</p>
                      <p className="text-xs text-gray-400">@{u.username}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{u.position || "-"}</td>
                <td className="px-6 py-4"><span className="px-3 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-600">{u.department_name || "-"}</span></td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${u.role === "admin" ? "bg-purple-100 text-purple-600" : "bg-blue-100 text-blue-600"}`}>
                    {u.role === "admin" ? "ผู้ดูแลระบบ" : "เจ้าหน้าที่"}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => { setViewingStaff(u); loadStaffTasks(u.id); }} className="p-2 text-gray-400 hover:text-blue-500 transition-colors" title="ดูประวัติงาน"><Eye size={16} /></button>
                    <button onClick={() => onEdit(u)} className="p-2 text-gray-400 hover:text-[#5A5A40] transition-colors" title="แก้ไข"><Edit3 size={16} /></button>
                    {u.role !== "admin" && (
                      <button onClick={() => onDelete(u.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors" title="ลบ"><Trash2 size={16} /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {staffUsers.length === 0 && <div className="text-center py-16 text-gray-400">ไม่พบเจ้าหน้าที่</div>}
      </div>

      {/* Staff Detail Modal */}
      {viewingStaff && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setViewingStaff(null)}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} onClick={e => e.stopPropagation()}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-[#F5F5F0] flex items-center justify-center text-[#5A5A40] font-bold text-xl">{viewingStaff.first_name[0]}{viewingStaff.last_name[0]}</div>
                <div>
                  <h3 className="text-xl font-serif font-bold">{viewingStaff.first_name} {viewingStaff.last_name}</h3>
                  <p className="text-sm text-gray-400">{viewingStaff.position} • {viewingStaff.department_name}</p>
                </div>
              </div>
              <button onClick={() => setViewingStaff(null)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">ประวัติการได้รับมอบหมายงาน</h4>
              <div className="space-y-3">
                {(staffTasks[viewingStaff.id] || []).map((t: any) => (
                  <div key={t.id} className="p-4 rounded-2xl border border-gray-100 hover:bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-sm">{t.title}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${statusColor[t.status]}`}>{statusLabel[t.status]}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <span>กำหนดส่ง: {formatDate(t.due_date)}</span>
                      <span>ความคืบหน้า: {t.progress}%</span>
                      <span className={`font-bold ${priorityColor[t.priority]} px-1.5 py-0.5 rounded`}>{priorityLabel[t.priority]}</span>
                    </div>
                  </div>
                ))}
                {(!staffTasks[viewingStaff.id] || staffTasks[viewingStaff.id].length === 0) && (
                  <p className="text-center text-gray-400 py-8">ยังไม่มีงานที่ได้รับมอบหมาย</p>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}

// ============================================
// REPORTS PAGE
// ============================================
function ReportsPage({ stats }: { stats: Stats }) {
  const [staffReport, setStaffReport] = useState<StaffReport[]>([]);
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [dateReport, setDateReport] = useState<any[]>([]);

  useEffect(() => { loadStaffReport(); }, []);

  const loadStaffReport = async () => {
    const data = await api("/api/reports/by-staff");
    setStaffReport(data);
  };

  const loadDateReport = async () => {
    if (!dateRange.start || !dateRange.end) return;
    const data = await api(`/api/reports/by-date-range?start=${dateRange.start}&end=${dateRange.end}`);
    setDateReport(data);
  };

  const exportCSV = () => {
    window.open("/api/reports/export-csv", "_blank");
  };

  const totalTasks = stats.total || 1;
  const bars = [
    { label: "เสร็จสิ้น", value: stats.completed, color: "bg-emerald-500", pct: Math.round((stats.completed / totalTasks) * 100) },
    { label: "กำลังดำเนินการ", value: stats.inProgress, color: "bg-amber-500", pct: Math.round((stats.inProgress / totalTasks) * 100) },
    { label: "รอดำเนินการ", value: stats.pending, color: "bg-gray-400", pct: Math.round((stats.pending / totalTasks) * 100) },
    { label: "ยกเลิก", value: stats.cancelled, color: "bg-rose-500", pct: Math.round((stats.cancelled / totalTasks) * 100) },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-serif font-bold">สรุปรายงาน</h3>
        <button onClick={exportCSV} className="flex items-center gap-2 bg-[#5A5A40] text-white px-4 py-2 rounded-xl text-sm font-medium shadow-md hover:bg-[#4A4A30] transition-colors">
          <Download size={18} /> ส่งออก CSV
        </button>
      </div>

      {/* Overview Chart */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-black/5">
        <h4 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-6">ภาพรวมสถานะงาน</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            {bars.map(b => (
              <div key={b.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-700">{b.label}</span>
                  <span className="text-gray-500">{b.value} ({b.pct}%)</span>
                </div>
                <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${b.color} transition-all duration-500`} style={{ width: `${b.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center">
            <div className="text-center">
              <p className="text-6xl font-serif font-bold text-[#5A5A40]">{stats.total}</p>
              <p className="text-sm text-gray-400 mt-2">งานทั้งหมดในระบบ</p>
              <p className="text-2xl font-serif font-bold text-emerald-500 mt-4">{stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%</p>
              <p className="text-xs text-gray-400">อัตราความสำเร็จ</p>
            </div>
          </div>
        </div>
      </div>

      {/* By Staff Report */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-black/5">
        <h4 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-6">รายงานตามเจ้าหน้าที่</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-4 py-3 text-xs font-bold uppercase text-gray-500">เจ้าหน้าที่</th>
                <th className="px-4 py-3 text-xs font-bold uppercase text-gray-500">หน่วยงาน</th>
                <th className="px-4 py-3 text-xs font-bold uppercase text-gray-500 text-center">ทั้งหมด</th>
                <th className="px-4 py-3 text-xs font-bold uppercase text-gray-500 text-center">เสร็จสิ้น</th>
                <th className="px-4 py-3 text-xs font-bold uppercase text-gray-500 text-center">กำลังดำเนินการ</th>
                <th className="px-4 py-3 text-xs font-bold uppercase text-gray-500 text-center">รอดำเนินการ</th>
                <th className="px-4 py-3 text-xs font-bold uppercase text-gray-500">ภาพรวม</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {staffReport.map(s => {
                const pct = s.total_tasks > 0 ? Math.round((s.completed / s.total_tasks) * 100) : 0;
                return (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[#F5F5F0] flex items-center justify-center text-[#5A5A40] font-bold text-xs">{s.first_name[0]}{s.last_name[0]}</div>
                        <span className="text-sm font-medium">{s.first_name} {s.last_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{s.department_name || "-"}</td>
                    <td className="px-4 py-3 text-sm text-center font-bold">{s.total_tasks}</td>
                    <td className="px-4 py-3 text-sm text-center text-emerald-600 font-bold">{s.completed}</td>
                    <td className="px-4 py-3 text-sm text-center text-amber-600 font-bold">{s.in_progress}</td>
                    <td className="px-4 py-3 text-sm text-center text-gray-500 font-bold">{s.pending}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-gray-500">{pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {staffReport.length === 0 && <p className="text-center text-gray-400 py-8">ไม่มีข้อมูล</p>}
        </div>
      </div>

      {/* By Date Range */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-black/5">
        <h4 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4">รายงานตามช่วงเวลา</h4>
        <div className="flex gap-4 items-end mb-6">
          <div>
            <label className="block text-xs font-bold text-gray-400 mb-1">จากวันที่</label>
            <input type="date" className="px-4 py-2 bg-gray-50 rounded-xl text-sm border-none focus:ring-2 focus:ring-[#5A5A40] outline-none" value={dateRange.start} onChange={e => setDateRange(p => ({ ...p, start: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 mb-1">ถึงวันที่</label>
            <input type="date" className="px-4 py-2 bg-gray-50 rounded-xl text-sm border-none focus:ring-2 focus:ring-[#5A5A40] outline-none" value={dateRange.end} onChange={e => setDateRange(p => ({ ...p, end: e.target.value }))} />
          </div>
          <button onClick={loadDateReport} className="px-6 py-2 bg-[#5A5A40] text-white rounded-xl text-sm font-medium hover:bg-[#4A4A30] transition-colors">ค้นหา</button>
        </div>
        {dateReport.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead><tr className="border-b border-gray-100">
                <th className="px-4 py-3 text-xs font-bold uppercase text-gray-500">วันที่</th>
                <th className="px-4 py-3 text-xs font-bold uppercase text-gray-500">สถานะ</th>
                <th className="px-4 py-3 text-xs font-bold uppercase text-gray-500 text-center">จำนวน</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {dateReport.map((r, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{formatDate(r.due_date)}</td>
                    <td className="px-4 py-3"><span className={`text-xs font-bold px-2 py-1 rounded ${statusColor[r.status]}`}>{statusLabel[r.status]}</span></td>
                    <td className="px-4 py-3 text-sm text-center font-bold">{r.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center text-gray-400 py-8 text-sm">กรุณาเลือกช่วงเวลาแล้วกดค้นหา</p>
        )}
      </div>
    </motion.div>
  );
}

// ============================================
// NOTIFICATIONS PAGE
// ============================================
function NotificationsPage({ notifications, onMarkRead, onMarkAllRead, onViewTask }: {
  notifications: Notification[];
  onMarkRead: (id: number) => void; onMarkAllRead: () => void; onViewTask: (refId: number) => void;
}) {
  const typeIcon: Record<string, React.ReactNode> = {
    task_assigned: <Plus size={16} className="text-blue-500" />,
    task_updated: <Edit3 size={16} className="text-amber-500" />,
    task_deadline: <AlertTriangle size={16} className="text-rose-500" />,
    status_changed: <TrendingUp size={16} className="text-emerald-500" />,
    info: <Bell size={16} className="text-gray-500" />,
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">{notifications.filter(n => !n.is_read).length} รายการที่ยังไม่ได้อ่าน</p>
        <button onClick={onMarkAllRead} className="text-sm text-[#5A5A40] font-medium hover:underline flex items-center gap-1"><CheckCheck size={16} /> อ่านทั้งหมด</button>
      </div>
      <div className="space-y-3">
        {notifications.map(n => (
          <div key={n.id}
            className={`bg-white p-4 rounded-2xl shadow-sm border transition-all cursor-pointer hover:shadow-md ${n.is_read ? "border-black/5 opacity-70" : "border-[#5A5A40]/20 bg-[#5A5A40]/[0.02]"}`}
            onClick={() => { if (!n.is_read) onMarkRead(n.id); if (n.reference_id) onViewTask(n.reference_id); }}>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">{typeIcon[n.type] || typeIcon.info}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-medium text-sm text-gray-900">{n.title}</p>
                  {!n.is_read && <span className="w-2 h-2 rounded-full bg-[#5A5A40] flex-shrink-0" />}
                </div>
                <p className="text-sm text-gray-500">{n.message}</p>
                <p className="text-xs text-gray-400 mt-1">{formatDateTime(n.created_at)}</p>
              </div>
            </div>
          </div>
        ))}
        {notifications.length === 0 && <div className="text-center py-16 text-gray-400"><Bell size={48} className="mx-auto mb-4 opacity-50" /><p>ไม่มีการแจ้งเตือน</p></div>}
      </div>
    </motion.div>
  );
}

// ============================================
// SETTINGS PAGE (Master Data)
// ============================================
function SettingsPage({ departments, taskTypes, onRefresh }: { departments: Department[]; taskTypes: TaskType[]; onRefresh: () => void }) {
  const [tab, setTab] = useState<"departments" | "taskTypes">("departments");
  const [newDeptName, setNewDeptName] = useState("");
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [newTypeName, setNewTypeName] = useState("");
  const [editingType, setEditingType] = useState<TaskType | null>(null);
  const [error, setError] = useState("");

  const handleAddDept = async () => {
    if (!newDeptName.trim()) return;
    try { await api("/api/departments", { method: "POST", body: JSON.stringify({ name: newDeptName.trim() }) }); setNewDeptName(""); setError(""); onRefresh(); } catch (e: any) { setError(e.message); }
  };
  const handleEditDept = async () => {
    if (!editingDept) return;
    try { await api(`/api/departments/${editingDept.id}`, { method: "PUT", body: JSON.stringify({ name: editingDept.name }) }); setEditingDept(null); setError(""); onRefresh(); } catch (e: any) { setError(e.message); }
  };
  const handleDeleteDept = async (id: number) => {
    try { await api(`/api/departments/${id}`, { method: "DELETE" }); setError(""); onRefresh(); } catch (e: any) { setError(e.message); }
  };
  const handleAddType = async () => {
    if (!newTypeName.trim()) return;
    try { await api("/api/task-types", { method: "POST", body: JSON.stringify({ name: newTypeName.trim() }) }); setNewTypeName(""); setError(""); onRefresh(); } catch (e: any) { setError(e.message); }
  };
  const handleEditType = async () => {
    if (!editingType) return;
    try { await api(`/api/task-types/${editingType.id}`, { method: "PUT", body: JSON.stringify({ name: editingType.name }) }); setEditingType(null); setError(""); onRefresh(); } catch (e: any) { setError(e.message); }
  };
  const handleDeleteType = async (id: number) => {
    try { await api(`/api/task-types/${id}`, { method: "DELETE" }); setError(""); onRefresh(); } catch (e: any) { setError(e.message); }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
      <div className="flex gap-2">
        <button onClick={() => setTab("departments")} className={`px-6 py-2 rounded-xl text-sm font-medium transition-colors ${tab === "departments" ? "bg-[#5A5A40] text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>
          <Settings size={16} className="inline mr-2" />หน่วยงาน
        </button>
        <button onClick={() => setTab("taskTypes")} className={`px-6 py-2 rounded-xl text-sm font-medium transition-colors ${tab === "taskTypes" ? "bg-[#5A5A40] text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>
          <Tag size={16} className="inline mr-2" />ประเภทงาน
        </button>
      </div>

      {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl">{error}</div>}

      {tab === "departments" && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-black/5">
          <h4 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4">จัดการหน่วยงาน</h4>
          <div className="flex gap-3 mb-6">
            <input type="text" placeholder="ชื่อหน่วยงานใหม่..." className="flex-1 px-4 py-2 bg-gray-50 rounded-xl text-sm border-none focus:ring-2 focus:ring-[#5A5A40] outline-none"
              value={newDeptName} onChange={e => setNewDeptName(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAddDept()} />
            <button onClick={handleAddDept} className="px-6 py-2 bg-[#5A5A40] text-white rounded-xl text-sm font-medium hover:bg-[#4A4A30]"><Plus size={16} className="inline mr-1" />เพิ่ม</button>
          </div>
          <div className="space-y-2">
            {departments.map(d => (
              <div key={d.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 border border-gray-100">
                {editingDept?.id === d.id ? (
                  <input type="text" className="flex-1 px-3 py-1 rounded-lg border border-[#5A5A40] text-sm outline-none mr-3" value={editingDept.name} onChange={e => setEditingDept({ ...editingDept, name: e.target.value })} onKeyDown={e => e.key === "Enter" && handleEditDept()} autoFocus />
                ) : (
                  <span className="text-sm font-medium text-gray-700">{d.name}</span>
                )}
                <div className="flex items-center gap-1">
                  {editingDept?.id === d.id ? (
                    <>
                      <button onClick={handleEditDept} className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-lg"><CheckCircle2 size={16} /></button>
                      <button onClick={() => setEditingDept(null)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg"><X size={16} /></button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => setEditingDept(d)} className="p-1.5 text-gray-400 hover:text-[#5A5A40] hover:bg-gray-100 rounded-lg"><Edit3 size={14} /></button>
                      <button onClick={() => handleDeleteDept(d.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "taskTypes" && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-black/5">
          <h4 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4">จัดการประเภทงาน</h4>
          <div className="flex gap-3 mb-6">
            <input type="text" placeholder="ชื่อประเภทงานใหม่..." className="flex-1 px-4 py-2 bg-gray-50 rounded-xl text-sm border-none focus:ring-2 focus:ring-[#5A5A40] outline-none"
              value={newTypeName} onChange={e => setNewTypeName(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAddType()} />
            <button onClick={handleAddType} className="px-6 py-2 bg-[#5A5A40] text-white rounded-xl text-sm font-medium hover:bg-[#4A4A30]"><Plus size={16} className="inline mr-1" />เพิ่ม</button>
          </div>
          <div className="space-y-2">
            {taskTypes.map(t => (
              <div key={t.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 border border-gray-100">
                {editingType?.id === t.id ? (
                  <input type="text" className="flex-1 px-3 py-1 rounded-lg border border-[#5A5A40] text-sm outline-none mr-3" value={editingType.name} onChange={e => setEditingType({ ...editingType, name: e.target.value })} onKeyDown={e => e.key === "Enter" && handleEditType()} autoFocus />
                ) : (
                  <span className="text-sm font-medium text-gray-700">{t.name}</span>
                )}
                <div className="flex items-center gap-1">
                  {editingType?.id === t.id ? (
                    <>
                      <button onClick={handleEditType} className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-lg"><CheckCircle2 size={16} /></button>
                      <button onClick={() => setEditingType(null)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg"><X size={16} /></button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => setEditingType(t)} className="p-1.5 text-gray-400 hover:text-[#5A5A40] hover:bg-gray-100 rounded-lg"><Edit3 size={14} /></button>
                      <button onClick={() => handleDeleteType(t.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ============================================
// TASK FORM MODAL (Create/Edit)
// ============================================
function TaskFormModal({ task, users, taskTypes, currentUser, onClose, onSave }: {
  task: Task | null; users: User[]; taskTypes: TaskType[]; currentUser: User;
  onClose: () => void; onSave: () => void;
}) {
  const [form, setForm] = useState({
    title: task?.title || "",
    description: task?.description || "",
    task_type_id: task?.task_type_id || "",
    priority: task?.priority || "medium",
    status: task?.status || "pending",
    due_date: task?.due_date || "",
    assigned_user_ids: task?.assignments.map(a => a.id) || [] as number[],
  });
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Load existing checklist when editing
  useEffect(() => {
    if (task) {
      api(`/api/tasks/${task.id}/checklists`).then((rows: any[]) => {
        const parents = rows.filter(r => !r.parent_id);
        const items: ChecklistItem[] = parents.map(p => ({
          title: p.title,
          is_checked: !!p.is_checked,
          sort_order: p.sort_order,
          children: rows.filter(c => c.parent_id === p.id).map(c => ({ title: c.title, is_checked: !!c.is_checked, sort_order: c.sort_order })),
        }));
        setChecklist(items);
      }).catch(() => {});
    }
  }, [task]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      let taskId = task?.id;
      if (task) {
        await api(`/api/tasks/${task.id}`, { method: "PUT", body: JSON.stringify({ ...form, task_type_id: form.task_type_id || null }) });
      } else {
        const result = await api("/api/tasks", { method: "POST", body: JSON.stringify({ ...form, task_type_id: form.task_type_id || null, created_by: currentUser.id }) });
        taskId = result.id;
      }
      // Save checklist
      if (taskId && checklist.length > 0) {
        await api(`/api/tasks/${taskId}/checklists`, { method: "POST", body: JSON.stringify({ items: checklist }) });
      }
      onSave();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-xl font-serif font-bold">{task ? "แก้ไขงาน" : "สร้างงานใหม่"}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
        </div>
        {error && <div className="mx-6 mt-4 bg-red-50 text-red-600 text-sm p-3 rounded-xl">{error}</div>}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase text-gray-400 mb-1">ชื่องาน *</label>
              <input type="text" className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] outline-none" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-gray-400 mb-1">ประเภทงาน</label>
              <select className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] outline-none" value={form.task_type_id} onChange={e => setForm({ ...form, task_type_id: e.target.value })}>
                <option value="">-- เลือก --</option>
                {taskTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-gray-400 mb-1">ระดับความสำคัญ</label>
              <select className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] outline-none" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                <option value="low">ต่ำ</option>
                <option value="medium">ปานกลาง</option>
                <option value="high">สูง</option>
                <option value="urgent">เร่งด่วน</option>
              </select>
            </div>
            {task && (
              <div>
                <label className="block text-xs font-bold uppercase text-gray-400 mb-1">สถานะ</label>
                <select className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] outline-none" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                  <option value="pending">รอดำเนินการ</option>
                  <option value="in_progress">กำลังดำเนินการ</option>
                  <option value="completed">เสร็จสิ้น</option>
                  <option value="cancelled">ยกเลิก</option>
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs font-bold uppercase text-gray-400 mb-1">กำหนดส่ง *</label>
              <input type="date" className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] outline-none" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} required />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase text-gray-400 mb-1">รายละเอียด</label>
              <textarea className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] outline-none h-24 resize-none" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            {/* Checklist Section */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase text-gray-400 mb-2 flex items-center gap-1"><ListChecks size={14} /> Checklist หัวข้อทำงาน</label>
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-3 space-y-3">
                {checklist.map((item, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#5A5A40] w-6 text-center">{idx + 1}</span>
                      <input type="text" className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-[#5A5A40] outline-none" placeholder={`หัวข้อหลัก ${idx + 1}`}
                        value={item.title} onChange={e => { const c = [...checklist]; c[idx] = { ...c[idx], title: e.target.value }; setChecklist(c); }} />
                      <button type="button" onClick={() => { const c = [...checklist]; c[idx].children.push({ title: "", is_checked: false, sort_order: c[idx].children.length }); setChecklist([...c]); }}
                        className="p-1 text-[#5A5A40] hover:bg-[#5A5A40]/10 rounded-lg transition-colors" title="เพิ่มหัวข้อย่อย"><CornerDownRight size={14} /></button>
                      <button type="button" onClick={() => setChecklist(checklist.filter((_, i) => i !== idx))}
                        className="p-1 text-red-400 hover:bg-red-50 rounded-lg transition-colors" title="ลบ"><Trash2 size={14} /></button>
                    </div>
                    {item.children.map((child, ci) => (
                      <div key={ci} className="flex items-center gap-2 ml-8">
                        <span className="text-xs text-gray-400 w-8 text-center">{idx + 1}.{ci + 1}</span>
                        <input type="text" className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-[#5A5A40] outline-none" placeholder={`หัวข้อย่อย ${idx + 1}.${ci + 1}`}
                          value={child.title} onChange={e => { const c = [...checklist]; c[idx].children[ci] = { ...c[idx].children[ci], title: e.target.value }; setChecklist([...c]); }} />
                        <button type="button" onClick={() => { const c = [...checklist]; c[idx].children = c[idx].children.filter((_, i) => i !== ci); setChecklist([...c]); }}
                          className="p-1 text-red-400 hover:bg-red-50 rounded-lg transition-colors" title="ลบ"><Trash2 size={14} /></button>
                      </div>
                    ))}
                  </div>
                ))}
                <button type="button" onClick={() => setChecklist([...checklist, { title: "", is_checked: false, sort_order: checklist.length, children: [] }])}
                  className="flex items-center gap-1.5 text-xs font-medium text-[#5A5A40] hover:bg-[#5A5A40]/10 px-3 py-1.5 rounded-lg transition-colors">
                  <Plus size={14} /> เพิ่มหัวข้อหลัก
                </button>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase text-gray-400 mb-1">มอบหมายให้</label>
              <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-xl border border-gray-200 max-h-32 overflow-y-auto">
                {users.filter(u => u.role === "staff").map(u => (
                  <label key={u.id} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-gray-200 cursor-pointer hover:border-[#5A5A40] transition-colors">
                    <input type="checkbox" className="rounded text-[#5A5A40] focus:ring-[#5A5A40]"
                      checked={form.assigned_user_ids.includes(u.id)}
                      onChange={e => {
                        if (e.target.checked) setForm({ ...form, assigned_user_ids: [...form.assigned_user_ids, u.id] });
                        else setForm({ ...form, assigned_user_ids: form.assigned_user_ids.filter(id => id !== u.id) });
                      }} />
                    <span className="text-xs font-medium">{u.first_name} {u.last_name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={onClose} className="px-6 py-2 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100">ยกเลิก</button>
            <button type="submit" disabled={saving} className="px-6 py-2 bg-[#5A5A40] text-white rounded-xl text-sm font-bold shadow-lg hover:bg-[#4A4A30] disabled:opacity-50">
              {saving ? "กำลังบันทึก..." : task ? "บันทึกการแก้ไข" : "สร้างงาน"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ============================================
// TASK DETAIL MODAL
// ============================================
function TaskDetailModal({ task, user, taskTypes, onClose, onUpdate, onEdit }: {
  task: Task; user: User; taskTypes: TaskType[]; onClose: () => void; onUpdate: () => void; onEdit: (t: Task) => void;
}) {
  const [updates, setUpdates] = useState<TaskUpdate[]>([]);
  const [newUpdate, setNewUpdate] = useState({ text: "", progress: task.progress, attachment_url: "" });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [taskChecklist, setTaskChecklist] = useState<ChecklistItem[]>([]);

  useEffect(() => { fetchUpdates(); fetchChecklist(); }, [task.id]);

  const fetchChecklist = async () => {
    try {
      const rows = await api(`/api/tasks/${task.id}/checklists`);
      const parents = rows.filter((r: any) => !r.parent_id);
      const items: ChecklistItem[] = parents.map((p: any) => ({
        title: p.title,
        is_checked: !!p.is_checked,
        sort_order: p.sort_order,
        children: rows.filter((c: any) => c.parent_id === p.id).map((c: any) => ({ title: c.title, is_checked: !!c.is_checked, sort_order: c.sort_order })),
      }));
      setTaskChecklist(items);
    } catch {}
  };

  // Compute progress from checklist
  const allCheckItems = taskChecklist.flatMap(i => [i, ...i.children]);
  const checkTotal = allCheckItems.length;
  const checkChecked = allCheckItems.filter(i => i.is_checked).length;
  const checklistProgress = checkTotal > 0 ? Math.round((checkChecked / checkTotal) * 100) : task.progress;

  const toggleChecklistItem = async (parentIdx: number, childIdx?: number) => {
    const c = [...taskChecklist];
    if (childIdx !== undefined) {
      c[parentIdx].children[childIdx].is_checked = !c[parentIdx].children[childIdx].is_checked;
    } else {
      c[parentIdx].is_checked = !c[parentIdx].is_checked;
    }
    setTaskChecklist(c);
    await api(`/api/tasks/${task.id}/checklists`, { method: "POST", body: JSON.stringify({ items: c }) });
    onUpdate();
  };

  const fetchUpdates = async () => {
    try { const data = await api(`/api/tasks/${task.id}/updates`); setUpdates(data); } catch {}
  };

  const handleSubmitUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      let attachUrl = newUpdate.attachment_url || null;
      if (imageFile) {
        setUploading(true);
        const formData = new FormData();
        formData.append("image", imageFile);
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        if (!res.ok) throw new Error("อัปโหลดรูปภาพล้มเหลว");
        const data = await res.json();
        attachUrl = data.url;
        setUploading(false);
      }
      await api(`/api/tasks/${task.id}/updates`, {
        method: "POST",
        body: JSON.stringify({ user_id: user.id, update_text: newUpdate.text, progress: task.progress, attachment_url: attachUrl }),
      });
      setNewUpdate({ text: "", progress: newUpdate.progress, attachment_url: "" });
      setImageFile(null);
      setImagePreview(null);
      fetchUpdates();
      onUpdate();
    } catch {} finally { setSaving(false); setUploading(false); }
  };

  const handleStatusChange = async (newStatus: string) => {
    const progress = newStatus === "completed" ? 100 : newStatus === "cancelled" ? task.progress : task.progress;
    await api(`/api/tasks/${task.id}/status`, { method: "PATCH", body: JSON.stringify({ status: newStatus, progress }) });
    onUpdate();
    onClose();
  };

  const taskType = taskTypes.find(t => t.id === task.task_type_id);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${task.status === "completed" ? "bg-emerald-100 text-emerald-600" : "bg-[#F5F5F0] text-[#5A5A40]"}`}><ClipboardList size={20} /></div>
            <div>
              <h3 className="text-xl font-serif font-bold">{task.title}</h3>
              <p className="text-xs text-gray-400">สร้างโดย {task.creator_name} • {formatDateTime(task.created_at)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {user.role === "admin" && (
              <button onClick={() => onEdit(task)} className="p-2 text-gray-400 hover:text-[#5A5A40] transition-colors" title="แก้ไข"><Edit3 size={20} /></button>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left - Description & Updates */}
          <div className="lg:col-span-2 space-y-8">
            <section>
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">รายละเอียด</h4>
              <p className="text-gray-700 leading-relaxed">{task.description || "ไม่มีรายละเอียด"}</p>
            </section>

            {/* Checklist Section */}
            {taskChecklist.length > 0 && (
              <section>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5"><ListChecks size={14} /> Checklist หัวข้อทำงาน</h4>
                <div className="bg-gray-50 rounded-2xl border border-gray-100 p-4 space-y-3">
                  {taskChecklist.map((item, idx) => {
                    const totalChildren = item.children.length;
                    const checkedChildren = item.children.filter(c => c.is_checked).length;
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex items-center gap-2 group cursor-pointer" onClick={() => toggleChecklistItem(idx)}>
                          {item.is_checked ? <CheckSquare size={18} className="text-emerald-500 flex-shrink-0" /> : <Square size={18} className="text-gray-300 group-hover:text-gray-500 flex-shrink-0" />}
                          <span className={`text-sm font-bold ${item.is_checked ? "text-gray-400 line-through" : "text-gray-800"}`}>{idx + 1}. {item.title}</span>
                          {totalChildren > 0 && (
                            <span className="text-[10px] font-bold text-gray-400 ml-auto">{checkedChildren}/{totalChildren}</span>
                          )}
                        </div>
                        {item.children.map((child, ci) => (
                          <div key={ci} className="flex items-center gap-2 ml-7 group cursor-pointer" onClick={() => toggleChecklistItem(idx, ci)}>
                            {child.is_checked ? <CheckSquare size={16} className="text-emerald-500 flex-shrink-0" /> : <Square size={16} className="text-gray-300 group-hover:text-gray-500 flex-shrink-0" />}
                            <span className={`text-sm ${child.is_checked ? "text-gray-400 line-through" : "text-gray-600"}`}>{idx + 1}.{ci + 1} {child.title}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                  {(() => {
                    const allItems = taskChecklist.flatMap(i => [i, ...i.children]);
                    const total = allItems.length;
                    const checked = allItems.filter(i => i.is_checked).length;
                    const pct = total > 0 ? Math.round((checked / total) * 100) : 0;
                    return (
                      <div className="pt-3 border-t border-gray-200">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-gray-400 font-medium">ความคืบหน้า Checklist</span>
                          <span className="font-bold text-gray-700">{checked}/{total} ({pct}%)</span>
                        </div>
                        <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </section>
            )}

            {/* Status Quick Change (Admin) */}
            {user.role === "admin" && task.status !== "completed" && task.status !== "cancelled" && (
              <section>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">เปลี่ยนสถานะ</h4>
                <div className="flex gap-2">
                  {task.status !== "in_progress" && <button onClick={() => handleStatusChange("in_progress")} className="px-4 py-2 bg-amber-100 text-amber-700 rounded-xl text-sm font-medium hover:bg-amber-200">กำลังดำเนินการ</button>}
                  <button onClick={() => handleStatusChange("completed")} className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-xl text-sm font-medium hover:bg-emerald-200">เสร็จสิ้น</button>
                  <button onClick={() => handleStatusChange("cancelled")} className="px-4 py-2 bg-red-100 text-red-700 rounded-xl text-sm font-medium hover:bg-red-200">ยกเลิก</button>
                </div>
              </section>
            )}

            {/* Post Update */}
            <section>
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">อัปเดตความคืบหน้า</h4>
              <form onSubmit={handleSubmitUpdate} className="bg-gray-50 p-4 rounded-2xl border border-gray-100 mb-6">
                <textarea className="w-full bg-white px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] outline-none h-20 resize-none text-sm mb-3" placeholder="บันทึกความคืบหน้า..."
                  value={newUpdate.text} onChange={e => setNewUpdate({ ...newUpdate, text: e.target.value })} required />
                <div className="mb-3">
                  <label className="flex items-center gap-2 cursor-pointer w-fit px-4 py-2 bg-white rounded-xl border border-gray-200 hover:border-[#5A5A40] transition-colors text-sm text-gray-500">
                    <ImagePlus size={16} />
                    <span>{imageFile ? imageFile.name : "แนบรูปภาพ (ถ้ามี)"}</span>
                    <input type="file" accept="image/*" className="hidden" onChange={e => {
                      const f = e.target.files?.[0] || null;
                      setImageFile(f);
                      if (f) { const r = new FileReader(); r.onload = ev => setImagePreview(ev.target?.result as string); r.readAsDataURL(f); }
                      else setImagePreview(null);
                    }} />
                  </label>
                  {imagePreview && (
                    <div className="relative mt-2 inline-block">
                      <img src={imagePreview} alt="preview" className="max-h-32 rounded-xl border border-gray-200" />
                      <button type="button" onClick={() => { setImageFile(null); setImagePreview(null); }} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"><X size={12} /></button>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-end">
                  <button disabled={saving || uploading} className="bg-[#5A5A40] text-white px-6 py-2 rounded-xl text-sm font-bold shadow-md hover:bg-[#4A4A30] disabled:opacity-50">
                    {uploading ? "กำลังอัปโหลด..." : saving ? "กำลังบันทึก..." : "บันทึก"}
                  </button>
                </div>
              </form>

              {/* Updates Timeline */}
              <div className="space-y-6">
                {updates.map(update => (
                  <div key={update.id} className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-[#F5F5F0] flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-[#5A5A40]">{update.first_name[0]}{update.last_name[0]}</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-bold">{update.first_name} {update.last_name}</p>
                        <p className="text-[10px] text-gray-400">{formatDateTime(update.created_at)}</p>
                      </div>
                      <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
                        <p className="text-sm text-gray-600">{update.update_text}</p>
                        {update.attachment_url && (
                          <div className="mt-2">
                            <img src={update.attachment_url} alt="แนบรูปภาพ" className="max-h-48 rounded-xl border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity" onClick={() => window.open(update.attachment_url, '_blank')} />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {updates.length === 0 && <p className="text-center text-gray-400 py-4 text-sm">ยังไม่มีการอัปเดต</p>}
              </div>
            </section>
          </div>

          {/* Right - Info Panel */}
          <div className="space-y-6">
            <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 space-y-5">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">สถานะ</h4>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${statusDot[task.status]}`} />
                  <span className="text-sm font-bold">{statusLabel[task.status]}</span>
                </div>
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">ระดับความสำคัญ</h4>
                <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-md ${priorityColor[task.priority]}`}>{priorityLabel[task.priority]}</span>
              </div>
              {taskType && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">ประเภทงาน</h4>
                  <span className="text-sm font-medium text-gray-700">{taskType.name}</span>
                </div>
              )}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">กำหนดส่ง</h4>
                <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
                  <Calendar size={16} className="text-gray-400" />
                  {formatDate(task.due_date)}
                </div>
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">ผู้รับผิดชอบ</h4>
                <div className="space-y-2">
                  {task.assignments.map(a => (
                    <div key={a.id} className="flex items-center gap-2 bg-white p-2 rounded-xl border border-gray-200">
                      <div className="w-6 h-6 rounded-full bg-[#F5F5F0] flex items-center justify-center text-[10px] font-bold text-[#5A5A40]">{a.first_name[0]}{a.last_name[0]}</div>
                      <span className="text-xs font-medium">{a.first_name} {a.last_name}</span>
                    </div>
                  ))}
                  {task.assignments.length === 0 && <p className="text-xs text-gray-400">ยังไม่ได้มอบหมาย</p>}
                </div>
              </div>
            </div>

            <div className="bg-[#5A5A40] p-6 rounded-3xl text-white shadow-lg shadow-[#5A5A40]/20">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white/60 mb-4">ความคืบหน้ารวม</h4>
              <div className="flex items-end justify-between mb-2">
                <span className="text-3xl font-serif font-bold">{checklistProgress}%</span>
                <span className="text-xs text-white/60 mb-1">สำเร็จ</span>
              </div>
              <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${checklistProgress}%` }} className="h-full bg-white rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ============================================
// USER FORM MODAL (Create/Edit)
// ============================================
function UserFormModal({ user, departments, onClose, onSave }: {
  user: User | null; departments: Department[]; onClose: () => void; onSave: () => void;
}) {
  const [form, setForm] = useState({
    username: user?.username || "",
    password: "",
    first_name: user?.first_name || "",
    last_name: user?.last_name || "",
    role: user?.role || "staff",
    department_id: user?.department_id || "",
    position: user?.position || "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (user) {
        await api(`/api/users/${user.id}`, { method: "PUT", body: JSON.stringify(form) });
      } else {
        if (!form.password) { setError("กรุณากรอกรหัสผ่าน"); setSaving(false); return; }
        await api("/api/users", { method: "POST", body: JSON.stringify(form) });
      }
      onSave();
    } catch (e: any) {
      setError(e.message);
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-xl font-serif font-bold">{user ? "แก้ไขเจ้าหน้าที่" : "เพิ่มเจ้าหน้าที่ใหม่"}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
        </div>
        {error && <div className="mx-6 mt-4 bg-red-50 text-red-600 text-sm p-3 rounded-xl">{error}</div>}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-gray-400 mb-1">ชื่อ *</label>
              <input type="text" className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] outline-none" value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} required />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-gray-400 mb-1">นามสกุล *</label>
              <input type="text" className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] outline-none" value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} required />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-gray-400 mb-1">ชื่อผู้ใช้ *</label>
            <input type="text" className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] outline-none" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} required />
          </div>
          {!user && (
            <div>
              <label className="block text-xs font-bold uppercase text-gray-400 mb-1">รหัสผ่าน *</label>
              <input type="password" className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] outline-none" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required={!user} />
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-gray-400 mb-1">ตำแหน่ง</label>
              <input type="text" className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] outline-none" value={form.position} onChange={e => setForm({ ...form, position: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-gray-400 mb-1">หน่วยงาน</label>
              <select className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] outline-none" value={form.department_id} onChange={e => setForm({ ...form, department_id: e.target.value })}>
                <option value="">-- เลือก --</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-gray-400 mb-1">บทบาท</label>
            <select className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] outline-none" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
              <option value="staff">เจ้าหน้าที่</option>
              <option value="admin">ผู้ดูแลระบบ</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={onClose} className="px-6 py-2 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100">ยกเลิก</button>
            <button type="submit" disabled={saving} className="px-6 py-2 bg-[#5A5A40] text-white rounded-xl text-sm font-bold shadow-lg hover:bg-[#4A4A30] disabled:opacity-50">
              {saving ? "กำลังบันทึก..." : user ? "บันทึกการแก้ไข" : "เพิ่มเจ้าหน้าที่"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ============================================
// PROFILE MODAL
// ============================================
function ProfileModal({ user, departments, onClose, onSave }: {
  user: User; departments: Department[]; onClose: () => void; onSave: (u: User) => void;
}) {
  const [tab, setTab] = useState<"profile" | "password">("profile");
  const [form, setForm] = useState({
    username: user.username, first_name: user.first_name, last_name: user.last_name,
    role: user.role, department_id: user.department_id || "", position: user.position,
  });
  const [pwForm, setPwForm] = useState({ old_password: "", new_password: "", confirm_password: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api(`/api/users/${user.id}`, { method: "PUT", body: JSON.stringify(form) });
      const updated = await api(`/api/users/${user.id}`);
      onSave(updated);
    } catch (e: any) { setError(e.message); } finally { setSaving(false); }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwForm.new_password !== pwForm.confirm_password) { setError("รหัสผ่านใหม่ไม่ตรงกัน"); return; }
    setSaving(true);
    try {
      await api(`/api/users/${user.id}/password`, { method: "PUT", body: JSON.stringify({ old_password: pwForm.old_password, new_password: pwForm.new_password }) });
      setSuccess("เปลี่ยนรหัสผ่านสำเร็จ");
      setPwForm({ old_password: "", new_password: "", confirm_password: "" });
      setError("");
    } catch (e: any) { setError(e.message); setSuccess(""); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-xl font-serif font-bold">โปรไฟล์</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
        </div>
        <div className="flex border-b border-gray-100">
          <button onClick={() => { setTab("profile"); setError(""); setSuccess(""); }} className={`flex-1 py-3 text-sm font-medium transition-colors ${tab === "profile" ? "text-[#5A5A40] border-b-2 border-[#5A5A40]" : "text-gray-400"}`}>ข้อมูลส่วนตัว</button>
          <button onClick={() => { setTab("password"); setError(""); setSuccess(""); }} className={`flex-1 py-3 text-sm font-medium transition-colors ${tab === "password" ? "text-[#5A5A40] border-b-2 border-[#5A5A40]" : "text-gray-400"}`}>เปลี่ยนรหัสผ่าน</button>
        </div>
        {error && <div className="mx-6 mt-4 bg-red-50 text-red-600 text-sm p-3 rounded-xl">{error}</div>}
        {success && <div className="mx-6 mt-4 bg-emerald-50 text-emerald-600 text-sm p-3 rounded-xl">{success}</div>}

        {tab === "profile" ? (
          <form onSubmit={handleSaveProfile} className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-400 mb-1">ชื่อ</label>
                <input type="text" className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] outline-none" value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-gray-400 mb-1">นามสกุล</label>
                <input type="text" className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] outline-none" value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-gray-400 mb-1">ตำแหน่ง</label>
              <input type="text" className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] outline-none" value={form.position} onChange={e => setForm({ ...form, position: e.target.value })} />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button type="button" onClick={onClose} className="px-6 py-2 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100">ยกเลิก</button>
              <button type="submit" disabled={saving} className="px-6 py-2 bg-[#5A5A40] text-white rounded-xl text-sm font-bold shadow-lg hover:bg-[#4A4A30] disabled:opacity-50">บันทึก</button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleChangePassword} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-gray-400 mb-1">รหัสผ่านเดิม</label>
              <input type="password" className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] outline-none" value={pwForm.old_password} onChange={e => setPwForm({ ...pwForm, old_password: e.target.value })} required />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-gray-400 mb-1">รหัสผ่านใหม่</label>
              <input type="password" className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] outline-none" value={pwForm.new_password} onChange={e => setPwForm({ ...pwForm, new_password: e.target.value })} required />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-gray-400 mb-1">ยืนยันรหัสผ่านใหม่</label>
              <input type="password" className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] outline-none" value={pwForm.confirm_password} onChange={e => setPwForm({ ...pwForm, confirm_password: e.target.value })} required />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button type="button" onClick={onClose} className="px-6 py-2 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100">ยกเลิก</button>
              <button type="submit" disabled={saving} className="px-6 py-2 bg-[#5A5A40] text-white rounded-xl text-sm font-bold shadow-lg hover:bg-[#4A4A30] disabled:opacity-50">เปลี่ยนรหัสผ่าน</button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}

// ============================================
// SMALL COMPONENTS
// ============================================
function StatCard({ title, value, icon, bg }: { title: string; value: number; icon: React.ReactNode; bg: string }) {
  return (
    <div className="bg-white p-5 rounded-3xl shadow-sm border border-black/5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${bg}`}>{icon}</div>
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-gray-400">{title}</p>
        <p className="text-2xl font-serif font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

function TaskCard({ task, onClick, onEdit }: { task: Task; onClick: () => void; onEdit?: () => void }) {
  return (
    <motion.div whileHover={{ y: -4 }} className="bg-white p-6 rounded-3xl shadow-sm border border-black/5 cursor-pointer group relative">
      <div onClick={onClick}>
        <div className="flex items-start justify-between mb-4">
          <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-md ${priorityColor[task.priority]}`}>{priorityLabel[task.priority]}</span>
          <div className="flex -space-x-2">
            {task.assignments.slice(0, 3).map(a => (
              <div key={a.id} className="w-8 h-8 rounded-full bg-[#F5F5F0] border-2 border-white flex items-center justify-center text-[10px] font-bold text-[#5A5A40]">{a.first_name[0]}{a.last_name[0]}</div>
            ))}
            {task.assignments.length > 3 && <div className="w-8 h-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-gray-400">+{task.assignments.length - 3}</div>}
          </div>
        </div>
        <h4 className="font-serif font-bold text-lg text-gray-900 mb-2 group-hover:text-[#5A5A40] transition-colors">{task.title}</h4>
        <p className="text-sm text-gray-500 line-clamp-2 mb-4">{task.description}</p>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-gray-400 font-medium">ความคืบหน้า</span>
            <span className="text-gray-900 font-bold">{task.progress}%</span>
          </div>
          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${task.progress}%` }} className={`h-full rounded-full ${task.status === "completed" ? "bg-emerald-500" : "bg-[#5A5A40]"}`} />
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-gray-400"><Calendar size={14} /><span>{formatDate(task.due_date)}</span></div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${statusColor[task.status]}`}>{statusLabel[task.status]}</span>
        </div>
      </div>
      {onEdit && (
        <button onClick={e => { e.stopPropagation(); onEdit(); }} className="absolute top-4 right-4 p-1.5 text-gray-300 hover:text-[#5A5A40] bg-white rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-all" title="แก้ไข"><Edit3 size={14} /></button>
      )}
    </motion.div>
  );
}

function ConfirmDialog({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4"><AlertTriangle className="text-red-500" size={24} /></div>
        <p className="text-gray-700 font-medium mb-6">{message}</p>
        <div className="flex justify-center gap-3">
          <button onClick={onCancel} className="px-6 py-2 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100">ยกเลิก</button>
          <button onClick={onConfirm} className="px-6 py-2 bg-red-500 text-white rounded-xl text-sm font-bold shadow-lg hover:bg-red-600">ยืนยัน</button>
        </div>
      </motion.div>
    </div>
  );
}
