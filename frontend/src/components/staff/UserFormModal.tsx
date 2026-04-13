import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { motion } from "motion/react";
import { userService } from "../../services/userService";
import type { User, Department } from "../../types";

interface UserFormModalProps {
  user: User | null;
  onClose: () => void;
  onSave: () => void;
}

export function UserFormModal({ user, onClose, onSave }: UserFormModalProps) {
  const [form, setForm] = useState({
    email: user?.email || "",
    username: user?.username || "",
    password: "",
    first_name: user?.first_name || "",
    last_name: user?.last_name || "",
    role: user?.role || "staff",
    department_id: user?.department_id ? String(user.department_id) : "",
    position: user?.position || "",
    line_user_id: user?.line_user_id || "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  useEffect(() => {
    userService.getDepartments().then((d) => {
      setDepartments(d);
      setLoadingInitial(false);
    }).catch((e) => {
      console.error(e);
      setLoadingInitial(false);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        username: form.username,
        first_name: form.first_name,
        last_name: form.last_name,
        role: form.role as "admin" | "staff",
        department_id: form.department_id || null,
        position: form.position || null,
        line_user_id: form.line_user_id || null,
      };
      if (user) {
        await userService.updateUser(user.id, payload);
      } else {
        if (!form.email) { setError("กรุณากรอกอีเมล"); setSaving(false); return; }
        if (!form.password) { setError("กรุณากรอกรหัสผ่าน"); setSaving(false); return; }
        await userService.createUser({ ...payload, email: form.email, password: form.password });
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
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
        className="app-surface rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-xl font-serif font-bold app-heading">{user ? "แก้ไขข้อมูลพนักงาน" : "เพิ่มพนักงานใหม่"}</h3>
          <button onClick={onClose} className="app-soft hover:text-[#1f1d16]"><X size={24} /></button>
        </div>
        {error && <div className="mx-6 mt-4 bg-red-50 text-red-600 text-sm p-3 rounded-xl border border-red-100">{error}</div>}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase app-soft mb-1">ชื่อ *</label>
              <input type="text" className="w-full px-4 py-2 rounded-xl app-field"
                value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} required />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase app-soft mb-1">นามสกุล *</label>
              <input type="text" className="w-full px-4 py-2 rounded-xl app-field"
                value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} required />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase app-soft mb-1">ชื่อผู้ใช้ *</label>
            <input type="text" className="w-full px-4 py-2 rounded-xl app-field"
              value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
          </div>
          {!user && (
            <>
              <div>
                <label className="block text-xs font-bold uppercase app-soft mb-1">อีเมล *</label>
                <input type="email" className="w-full px-4 py-2 rounded-xl app-field"
                  placeholder="example@email.com"
                  value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase app-soft mb-1">รหัสผ่าน *</label>
                <input type="password" className="w-full px-4 py-2 rounded-xl app-field"
                  placeholder="อย่างน้อย 8 ตัวอักษร"
                  value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
              </div>
            </>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase app-soft mb-1">ตำแหน่ง</label>
              <input type="text" className="w-full px-4 py-2 rounded-xl app-field"
                value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase app-soft mb-1">หน่วยงาน</label>
              <select className="w-full px-4 py-2 rounded-xl app-field"
                value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })} disabled={loadingInitial}>
                <option value="">-- เลือก --</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase app-soft mb-1">บทบาท</label>
            <select className="w-full px-4 py-2 rounded-xl app-field"
              value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as "admin" | "staff" })}>
              <option value="staff">พนักงาน</option>
              <option value="admin">แอดมิน</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase app-soft mb-1">LINE User ID</label>
            <input type="text" className="w-full px-4 py-2 rounded-xl app-field"
              placeholder="เช่น U1234567890..."
              value={form.line_user_id} onChange={(e) => setForm({ ...form, line_user_id: e.target.value })} />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={onClose} className="px-6 py-2 rounded-xl text-sm font-bold app-muted hover:bg-gray-100">ยกเลิก</button>
            <button type="submit" disabled={saving} className="px-6 py-2 bg-[#5A5A40] text-white rounded-xl text-sm font-bold shadow-lg hover:bg-[#4A4A30] disabled:opacity-50">
              {saving ? "กำลังบันทึก..." : user ? "บันทึกการแก้ไข" : "เพิ่มพนักงาน"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
