import React, { useState } from "react";
import { X } from "lucide-react";
import { motion } from "motion/react";
import { userService } from "../../services/userService";
import type { User, Department } from "../../types";

interface UserFormModalProps {
  user: User | null;
  departments: Department[];
  onClose: () => void;
  onSave: () => void;
}

export function UserFormModal({ user, departments, onClose, onSave }: UserFormModalProps) {
  const [form, setForm] = useState({
    username: user?.username || "",
    password: "",
    first_name: user?.first_name || "",
    last_name: user?.last_name || "",
    role: user?.role || "staff",
    department_id: user?.department_id ? String(user.department_id) : "",
    position: user?.position || "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        username: form.username,
        first_name: form.first_name,
        last_name: form.last_name,
        role: form.role as "admin" | "staff",
        department_id: form.department_id ? Number(form.department_id) : null,
        position: form.position || null,
      };
      if (user) {
        await userService.updateUser(user.id, payload);
      } else {
        if (!form.password) { setError("กรุณากรอกรหัสผ่าน"); setSaving(false); return; }
        await userService.createUser({ ...payload, password: form.password });
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
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-xl font-serif font-bold">{user ? "แก้ไขเจ้าหน้าที่" : "เพิ่มเจ้าหน้าที่ใหม่"}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
        </div>
        {error && <div className="mx-6 mt-4 bg-red-50 text-red-600 text-sm p-3 rounded-xl">{error}</div>}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-gray-400 mb-1">ชื่อ *</label>
              <input type="text" className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] outline-none"
                value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} required />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-gray-400 mb-1">นามสกุล *</label>
              <input type="text" className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] outline-none"
                value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} required />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-gray-400 mb-1">ชื่อผู้ใช้ *</label>
            <input type="text" className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] outline-none"
              value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
          </div>
          {!user && (
            <div>
              <label className="block text-xs font-bold uppercase text-gray-400 mb-1">รหัสผ่าน *</label>
              <input type="password" className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] outline-none"
                value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-gray-400 mb-1">ตำแหน่ง</label>
              <input type="text" className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] outline-none"
                value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-gray-400 mb-1">หน่วยงาน</label>
              <select className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] outline-none"
                value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })}>
                <option value="">-- เลือก --</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-gray-400 mb-1">บทบาท</label>
            <select className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] outline-none"
              value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as "admin" | "staff" })}>
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
