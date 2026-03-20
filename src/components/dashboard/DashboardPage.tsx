import { useEffect, useRef, useState } from "react";
import { ClipboardList, Clock, AlertCircle, CheckCircle2, XCircle, ChevronRight } from "lucide-react";
import { motion } from "motion/react";
import { StatCard } from "../common/StatCard";
import { UpcomingTasks } from "./UpcomingTasks";
import { DashboardSkeleton } from "../common/Skeleton";
import { taskService } from "../../services/taskService";
import { userService } from "../../services/userService";
import { formatDate } from "../../utils/formatters";
import { priorityLabel, priorityColor } from "../../utils/constants";
import type { Task, User, Stats } from "../../types";

interface DashboardPageProps {
  user: User;
  onViewTask: (task: Task) => void;
  onViewAll: () => void;
  refreshTrigger?: number;
}

export function DashboardPage({ user, onViewTask, onViewAll, refreshTrigger }: DashboardPageProps) {
  const [loading, setLoading] = useState(true);
  const [staffLoading, setStaffLoading] = useState(user.role === "admin");
  const [stats, setStats] = useState<Stats>({ total: 0, completed: 0, inProgress: 0, pending: 0, cancelled: 0 });
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const hasLoadedOnce = useRef(false);

  useEffect(() => {
    let mounted = true;

    async function loadCoreData() {
      try {
        if (!hasLoadedOnce.current) {
          setLoading(true);
        }

        const [s, t] = await Promise.all([
          taskService.getStats(),
          taskService.getTasks(),
        ]);

        if (mounted) {
          setStats(s);
          setTasks(t);
          setLoading(false);
          hasLoadedOnce.current = true;
        }
      } catch (error) {
        console.error("Failed to load dashboard data", error);
        if (mounted && !hasLoadedOnce.current) {
          setLoading(false);
        }
      }
    }

    async function loadUsers() {
      if (user.role !== "admin") {
        if (mounted) {
          setUsers([]);
          setStaffLoading(false);
        }
        return;
      }

      try {
        setStaffLoading(true);
        const loadedUsers = await userService.getUsers();
        if (mounted) {
          setUsers(loadedUsers);
        }
      } catch (error) {
        console.error("Failed to load staff data", error);
      } finally {
        if (mounted) {
          setStaffLoading(false);
        }
      }
    }

    void loadCoreData();
    void loadUsers();

    return () => { mounted = false; };
  }, [user.role, refreshTrigger]);

  if (loading) return <DashboardSkeleton />;

  const myTasks =
    user.role === "staff"
      ? tasks.filter((t) => t.assignments.some((a) => a.id === user.id))
      : tasks;

  const today = new Date().toISOString().split("T")[0];
  const activeTasks = myTasks.filter((t) => t.status !== "completed" && t.status !== "cancelled");
  const overdueTasks = activeTasks.filter((t) => t.due_date && t.due_date < today);
  const dueTodayTasks = activeTasks.filter((t) => t.due_date === today);
  const completionRate = myTasks.length > 0 ? Math.round((myTasks.filter((t) => t.status === "completed").length / myTasks.length) * 100) : 0;
  const urgentTasks = activeTasks.filter((t) => t.priority === "urgent").length;
  const unassignedTasks = activeTasks.filter((t) => t.assignments.length === 0).length;
  const dueSoonTasks = activeTasks.filter((t) => {
    if (!t.due_date) return false;
    const diffDays = Math.ceil((new Date(t.due_date).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 7;
  }).length;
  const workloadRanking = users
    .map((member) => ({
      ...member,
      assigned: tasks.filter((task) => task.status !== "completed" && task.status !== "cancelled" && task.assignments.some((assignee) => assignee.id === member.id)).length,
    }))
    .filter((member) => member.assigned > 0)
    .sort((a, b) => b.assigned - a.assigned)
    .slice(0, 5);
  const focusCards = [
    { label: user.role === "admin" ? "งานที่เปิดอยู่" : "งานของฉัน", value: activeTasks.length, tone: "text-blue-700" },
    { label: "เลยกำหนด", value: overdueTasks.length, tone: "text-rose-600" },
    { label: "ครบกำหนดวันนี้", value: dueTodayTasks.length, tone: "text-amber-600" },
    { label: "ปิดงานสำเร็จ", value: `${completionRate}%`, tone: "text-emerald-600" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="space-y-8"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard index={0} title="งานทั้งหมด" value={stats.total} icon={<ClipboardList className="text-blue-500" />} bg="bg-blue-50" />
        <StatCard index={1} title="กำลังดำเนินการ" value={stats.inProgress} icon={<Clock className="text-amber-500" />} bg="bg-amber-50" />
        <StatCard index={2} title="รอดำเนินการ" value={stats.pending} icon={<AlertCircle className="text-orange-500" />} bg="bg-orange-50" />
        <StatCard index={3} title="เสร็จสิ้น" value={stats.completed} icon={<CheckCircle2 className="text-emerald-500" />} bg="bg-emerald-50" />
        <StatCard index={4} title="ยกเลิก" value={stats.cancelled} icon={<XCircle className="text-rose-500" />} bg="bg-rose-50" />
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {focusCards.map((card) => (
          <div key={card.label} className="app-surface-subtle rounded-2xl px-5 py-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] app-soft mb-2">{card.label}</p>
            <p className={`text-2xl font-serif font-bold ${card.tone}`}>{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Tasks */}
        <div className="lg:col-span-2 app-surface rounded-3xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-serif font-bold app-heading">งานล่าสุด</h3>
            <button onClick={onViewAll} className="text-sm text-blue-600 font-medium hover:underline">
              ดูทั้งหมด
            </button>
          </div>
          <div className="space-y-3">
            {myTasks.slice(0, 6).map((task) => (
              <div
                key={task.id}
                onClick={() => onViewTask(task)}
                className="flex items-center justify-between p-4 rounded-2xl hover:bg-[var(--app-surface-muted)] transition-colors border border-transparent hover:border-gray-100 cursor-pointer group"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      task.status === "completed"
                        ? "bg-emerald-100 text-emerald-600"
                        : task.status === "in_progress"
                        ? "bg-amber-100 text-amber-600"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {task.status === "completed" ? <CheckCircle2 size={20} /> : <Clock size={20} />}
                  </div>
                  <div>
                    <p className="font-medium app-heading text-sm">{task.title}</p>
                    <p className="text-xs app-muted">กำหนดส่ง: {formatDate(task.due_date)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-md ${priorityColor[task.priority]}`}>
                    {priorityLabel[task.priority]}
                  </span>
                  <ChevronRight size={18} className="app-soft group-hover:text-blue-600" />
                </div>
              </div>
            ))}
            {myTasks.length === 0 && (
              <p className="text-center app-soft py-8">ยังไม่มีงาน</p>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <UpcomingTasks tasks={myTasks} onViewTask={onViewTask} />

          {user.role === "admin" && (
            <div className="space-y-6">
              <div className="app-surface rounded-3xl p-6">
                <h3 className="text-lg font-serif font-bold app-heading mb-4">ศูนย์ควบคุมผู้ดูแล</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-rose-50 px-4 py-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-rose-500/80 mb-2">งานเร่งด่วน</p>
                    <p className="text-2xl font-serif font-bold text-rose-600">{urgentTasks}</p>
                  </div>
                  <div className="rounded-2xl bg-amber-50 px-4 py-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-600/80 mb-2">ใกล้ครบกำหนด</p>
                    <p className="text-2xl font-serif font-bold text-amber-600">{dueSoonTasks}</p>
                  </div>
                  <div className="rounded-2xl bg-blue-50 px-4 py-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-600/80 mb-2">ยังไม่มอบหมาย</p>
                    <p className="text-2xl font-serif font-bold text-blue-700">{unassignedTasks}</p>
                  </div>
                  <div className="rounded-2xl bg-violet-50 px-4 py-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-violet-600/80 mb-2">ผู้ใช้ในระบบ</p>
                    <p className="text-2xl font-serif font-bold text-violet-700">{users.length}</p>
                  </div>
                </div>
              </div>

              <div className="app-surface rounded-3xl p-6">
                <h3 className="text-lg font-serif font-bold app-heading mb-4">โหลดงานของทีม</h3>
                <div className="space-y-4">
                  {workloadRanking.map((member) => (
                    <div key={member.id} className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#F5F5F0] flex items-center justify-center text-[#5A5A40] font-bold text-sm">
                        {member.first_name?.[0] ?? "?"}{member.last_name?.[0] ?? ""}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium app-heading truncate">{member.first_name} {member.last_name}</p>
                        <p className="text-xs app-soft">{member.position || member.department_name || "ยังไม่ระบุตำแหน่ง"}</p>
                      </div>
                      <span className="text-xs font-semibold text-blue-700 bg-sky-50 px-2 py-1 rounded-lg">
                        {member.assigned} งาน
                      </span>
                    </div>
                  ))}
                  {!staffLoading && workloadRanking.length === 0 && (
                    <p className="text-sm app-soft">ยังไม่มีข้อมูลโหลดงานของทีม</p>
                  )}
                </div>
              </div>

              <div className="app-surface rounded-3xl p-6">
                <h3 className="text-lg font-serif font-bold app-heading mb-4">เจ้าหน้าที่</h3>
                <div className="space-y-4">
                {staffLoading && users.length === 0 && (
                  <>
                    {[0, 1, 2].map((item) => (
                      <div key={item} className="flex items-center gap-3 animate-pulse">
                        <div className="w-10 h-10 rounded-full bg-sky-100" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3 rounded bg-sky-100 w-2/3" />
                          <div className="h-2.5 rounded bg-sky-50 w-1/2" />
                        </div>
                        <div className="w-16 h-6 rounded-lg bg-sky-100" />
                      </div>
                    ))}
                  </>
                )}

                {!staffLoading && users
                  .filter((u) => u.role === "staff")
                  .slice(0, 5)
                  .map((u) => (
                    <div key={u.id} className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center text-blue-700 font-bold text-sm">
                        {u.first_name?.[0] ?? "?"}{u.last_name?.[0] ?? ""}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium app-heading truncate">{u.first_name} {u.last_name}</p>
                        <p className="text-xs app-soft">{u.position || "ยังไม่ระบุตำแหน่ง"}</p>
                      </div>
                      <span className="text-xs font-medium text-blue-700 bg-sky-50 px-2 py-1 rounded-lg">
                        {u.department_name || "ไม่ระบุ"}
                      </span>
                    </div>
                  ))}

                {!staffLoading && users.filter((u) => u.role === "staff").length === 0 && (
                  <p className="text-sm app-soft">ยังไม่มีเจ้าหน้าที่ในระบบ</p>
                )}
              </div>
            </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
