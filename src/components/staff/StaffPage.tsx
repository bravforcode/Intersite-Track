import { useState, useEffect, useRef } from "react";
import { Search, Eye, Edit3, Trash2, X, KeyRound, Check } from "lucide-react";
import { motion } from "motion/react";
import { TasksSkeleton } from "../common/Skeleton";
import api from "../../services/api";
import { authService } from "../../services/authService";
import { userService } from "../../services/userService";
import { formatDate } from "../../utils/formatters";
import { statusColor, statusLabel, priorityColor, priorityLabel } from "../../utils/constants";
import type { User, Department, Task } from "../../types";

interface StaffPageProps {
  onEdit: (user: User) => void;
  onDelete: (id: string) => void;
  refreshTrigger?: number; // Used by App to trigger refresh
}

export function StaffPage({ onEdit, onDelete, refreshTrigger = 0 }: StaffPageProps) {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  
  const [search, setSearch] = useState("");
  const [staffTasks, setStaffTasks] = useState<Record<string, Task[]>>({});
  const [viewingStaff, setViewingStaff] = useState<User | null>(null);
  const [passwordTarget, setPasswordTarget] = useState<User | null>(null);
  const [passwordForm, setPasswordForm] = useState({ newPassword: "", confirmPassword: "" });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ ok: boolean; text: string } | null>(null);

  // Inline editing states
  const [editingPosition, setEditingPosition] = useState<{ id: string; value: string } | null>(null);
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [inlineSaving, setInlineSaving] = useState<string | null>(null);
  const positionInputRef = useRef<HTMLInputElement>(null);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [u, d] = await Promise.all([
        userService.getUsers(),
        userService.getDepartments()
      ]);
      setUsers(u);
      setDepartments(d);
    } catch (error) {
      console.error("Failed to load staff data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [refreshTrigger]);

  if (loading) return <TasksSkeleton />;

  const staffUsers = users.filter((u) => {
    if (search && !`${u.first_name} ${u.last_name} ${u.username} ${u.position}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const totalStaff = users.filter((u) => u.role !== "admin").length;
  const filteredStaff = staffUsers.filter((u) => u.role !== "admin").length;
  const adminCount = users.filter((u) => u.role === "admin").length;
  const departmentCount = new Set(users.map((u) => u.department_name).filter(Boolean)).size;

  const loadStaffTasks = async (userId: string) => {
    const tasks = await api.get<Task[]>(`/api/users/${userId}/tasks`);
    setStaffTasks((prev) => ({ ...prev, [userId]: tasks }));
  };

  const openPasswordReset = (target: User) => {
    setPasswordTarget(target);
    setPasswordForm({ newPassword: "", confirmPassword: "" });
    setPasswordMessage(null);
  };

  const startEditPosition = (u: User) => {
    setEditingPosition({ id: u.id, value: u.position || "" });
    setEditingRole(null);
    setTimeout(() => positionInputRef.current?.focus(), 50);
  };

  const savePosition = async (u: User) => {
    if (!editingPosition || editingPosition.id !== u.id) return;
    setInlineSaving(u.id);
    try {
      await userService.updateUser(u.id, {
        username: u.username,
        first_name: u.first_name,
        last_name: u.last_name,
        role: u.role,
        department_id: u.department_id ?? null,
        position: editingPosition.value.trim() || null,
      });
      setEditingPosition(null);
      await fetchAll();
    } catch (e: any) {
      console.error("บันทึกตำแหน่งไม่สำเร็จ", e);
    } finally {
      setInlineSaving(null);
    }
  };

  const saveRole = async (u: User, newRole: "admin" | "staff") => {
    if (editingRole !== u.id) return;
    setInlineSaving(u.id);
    try {
      await userService.updateUser(u.id, {
        username: u.username,
        first_name: u.first_name,
        last_name: u.last_name,
        role: newRole,
        department_id: u.department_id ?? null,
        position: u.position || null,
      });
      setEditingRole(null);
      await fetchAll();
    } catch (e: any) {
      console.error("บันทึกบทบาทไม่สำเร็จ", e);
    } finally {
      setInlineSaving(null);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!passwordTarget) return;

    if (passwordForm.newPassword.length < 8) {
      setPasswordMessage({ ok: false, text: "รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร" });
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMessage({ ok: false, text: "รหัสผ่านยืนยันไม่ตรงกัน" });
      return;
    }

    setPasswordSaving(true);
    try {
      await authService.adminResetPassword(passwordTarget.id, passwordForm.newPassword);
      setPasswordMessage({ ok: true, text: `รีเซ็ตรหัสผ่านของ ${passwordTarget.first_name} สำเร็จแล้ว` });
      setPasswordForm({ newPassword: "", confirmPassword: "" });
      setPasswordTarget(null);
    } catch (error: any) {
      setPasswordMessage({ ok: false, text: error?.message || "ไม่สามารถรีเซ็ตรหัสผ่านได้" });
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="space-y-6">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="app-surface-subtle rounded-2xl px-5 py-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] app-soft mb-2">พนักงานทั้งหมด</p>
          <p className="text-2xl font-serif font-bold text-[#5A5A40]">{totalStaff}</p>
        </div>
        <div className="app-surface-subtle rounded-2xl px-5 py-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] app-soft mb-2">แสดงผลตอนนี้</p>
          <p className="text-2xl font-serif font-bold text-amber-600">{filteredStaff}</p>
        </div>
        <div className="app-surface-subtle rounded-2xl px-5 py-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] app-soft mb-2">แอดมิน</p>
          <p className="text-2xl font-serif font-bold text-violet-600">{adminCount}</p>
        </div>
        <div className="app-surface-subtle rounded-2xl px-5 py-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] app-soft mb-2">หน่วยงาน</p>
          <p className="text-2xl font-serif font-bold text-sky-600">{departmentCount}</p>
        </div>
      </div>

      <div className="app-surface p-4 rounded-2xl">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 app-soft" size={18} />
          <input type="text" placeholder="ค้นหาพนักงาน..."
            className="w-full pl-10 pr-4 py-2 rounded-xl text-sm app-field"
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {passwordMessage && !passwordTarget && (
        <div className={`rounded-2xl px-4 py-3 text-sm border ${passwordMessage.ok ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-red-50 text-red-600 border-red-100"}`}>
          {passwordMessage.text}
        </div>
      )}

      <div className="app-surface rounded-3xl overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider app-muted">พนักงาน</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider app-muted">ตำแหน่ง</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider app-muted">หน่วยงาน</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider app-muted">บทบาท</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider app-muted text-right">การจัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {staffUsers.map((u) => (
              <tr key={u.id} className="hover:bg-(--app-surface-muted) transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#F5F5F0] flex items-center justify-center text-[#5A5A40] font-bold text-sm">
                      {u.first_name[0]}{u.last_name[0]}
                    </div>
                    <div>
                      <p className="font-medium app-heading">{u.first_name} {u.last_name}</p>
                      <p className="text-xs app-soft">@{u.username}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm app-muted">
                  {editingPosition?.id === u.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        ref={positionInputRef}
                        type="text"
                        className="px-2 py-1 rounded-lg border border-[#5A5A40] text-sm outline-none app-field w-36"
                        value={editingPosition.value}
                        onChange={(e) => setEditingPosition({ id: u.id, value: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") void savePosition(u);
                          if (e.key === "Escape") setEditingPosition(null);
                        }}
                        disabled={inlineSaving === u.id}
                      />
                      <button onClick={() => void savePosition(u)} disabled={inlineSaving === u.id}
                        className="p-1 text-emerald-500 hover:bg-emerald-50 rounded-lg disabled:opacity-40">
                        <Check size={14} />
                      </button>
                      <button onClick={() => setEditingPosition(null)}
                        className="p-1 app-soft hover:bg-gray-100 rounded-lg">
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <span
                      className="cursor-pointer hover:text-[#5A5A40] hover:underline transition-colors"
                      title="คลิกเพื่อแก้ไขตำแหน่ง"
                      onClick={() => startEditPosition(u)}
                    >
                      {u.position || <span className="text-gray-300 italic">คลิกเพื่อเพิ่มตำแหน่ง</span>}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span className="px-3 py-1 bg-gray-100 rounded-full text-xs font-medium app-muted">{u.department_name || "-"}</span>
                </td>
                <td className="px-6 py-4">
                  {editingRole === u.id ? (
                    <div className="flex items-center gap-1">
                      <select
                        autoFocus
                        className="px-2 py-1 rounded-lg border border-[#5A5A40] text-xs outline-none app-field"
                        defaultValue={u.role}
                        disabled={inlineSaving === u.id}
                        onChange={(e) => void saveRole(u, e.target.value as "admin" | "staff")}
                        onBlur={() => { if (inlineSaving !== u.id) setEditingRole(null); }}
                      >
                        <option value="staff">พนักงาน</option>
                        <option value="admin">แอดมิน</option>
                      </select>
                      <button onClick={() => setEditingRole(null)} className="p-1 app-soft hover:bg-gray-100 rounded-lg">
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity ${u.role === "admin" ? "bg-purple-100 text-purple-600" : "bg-blue-100 text-blue-600"}`}
                      title="คลิกเพื่อเปลี่ยนบทบาท"
                      onClick={() => { setEditingRole(u.id); setEditingPosition(null); }}
                    >
                      {u.role === "admin" ? "แอดมิน" : "พนักงาน"}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => { setViewingStaff(u); loadStaffTasks(u.id); }} className="p-2 app-soft hover:text-blue-500 transition-colors" title="ดูประวัติงาน">
                      <Eye size={16} />
                    </button>
                    <button onClick={() => openPasswordReset(u)} className="p-2 app-soft hover:text-amber-600 transition-colors" title="รีเซ็ตรหัสผ่าน">
                      <KeyRound size={16} />
                    </button>
                    <button onClick={() => onEdit(u)} className="p-2 app-soft hover:text-[#5A5A40] transition-colors" title="แก้ไข">
                      <Edit3 size={16} />
                    </button>
                    {u.role !== "admin" && (
                      <button onClick={() => onDelete(u.id)} className="p-2 app-soft hover:text-red-500 transition-colors" title="ลบ">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {staffUsers.length === 0 && <div className="text-center py-16 app-soft">ไม่พบพนักงาน</div>}
      </div>

      {/* Staff Detail Modal */}
      {viewingStaff && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setViewingStaff(null)}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} onClick={(e) => e.stopPropagation()}
            className="app-surface rounded-3xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-[#F5F5F0] flex items-center justify-center text-[#5A5A40] font-bold text-xl">
                  {viewingStaff.first_name[0]}{viewingStaff.last_name[0]}
                </div>
                <div>
                  <h3 className="text-xl font-serif font-bold app-heading">{viewingStaff.first_name} {viewingStaff.last_name}</h3>
                  <p className="text-sm app-soft">{viewingStaff.position} • {viewingStaff.department_name}</p>
                </div>
              </div>
              <button onClick={() => setViewingStaff(null)} className="app-soft hover:text-[#1f1d16]"><X size={24} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <h4 className="text-xs font-bold uppercase tracking-wider app-soft mb-4">ประวัติการได้รับมอบหมายงาน</h4>
              <div className="space-y-3">
                {(staffTasks[viewingStaff.id] || []).map((t) => (
                  <div key={t.id} className="p-4 rounded-2xl border border-gray-100 hover:bg-(--app-surface-muted)">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-sm app-heading">{t.title}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${statusColor[t.status]}`}>{statusLabel[t.status]}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs app-soft">
                      <span>กำหนดส่ง: {formatDate(t.due_date)}</span>
                      <span>ความคืบหน้า: {t.progress}%</span>
                      <span className={`font-bold ${priorityColor[t.priority]} px-1.5 py-0.5 rounded`}>{priorityLabel[t.priority]}</span>
                    </div>
                  </div>
                ))}
                {(!staffTasks[viewingStaff.id] || staffTasks[viewingStaff.id].length === 0) && (
                  <p className="text-center app-soft py-8">ยังไม่มีงานที่ได้รับมอบหมาย</p>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {passwordTarget && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setPasswordTarget(null)}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="app-surface rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
          >
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-serif font-bold app-heading">รีเซ็ตรหัสผ่าน</h3>
                <p className="text-sm app-soft">{passwordTarget.first_name} {passwordTarget.last_name}</p>
              </div>
              <button onClick={() => setPasswordTarget(null)} className="app-soft hover:text-[#1f1d16]"><X size={24} /></button>
            </div>

            <form onSubmit={handlePasswordReset} className="p-6 space-y-4">
              {passwordMessage && (
                <div className={`rounded-2xl px-4 py-3 text-sm border ${passwordMessage.ok ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-red-50 text-red-600 border-red-100"}`}>
                  {passwordMessage.text}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider app-soft mb-1">รหัสผ่านใหม่</label>
                <input
                  type="password"
                  className="w-full px-4 py-2 rounded-xl text-sm app-field"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider app-soft mb-1">ยืนยันรหัสผ่านใหม่</label>
                <input
                  type="password"
                  className="w-full px-4 py-2 rounded-xl text-sm app-field"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setPasswordTarget(null)} className="px-5 py-2 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100">
                  ปิด
                </button>
                <button type="submit" disabled={passwordSaving} className="px-5 py-2 bg-[#5A5A40] text-white rounded-xl text-sm font-bold hover:bg-[#4A4A30] disabled:opacity-50">
                  {passwordSaving ? "กำลังบันทึก..." : "ยืนยันการรีเซ็ต"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
