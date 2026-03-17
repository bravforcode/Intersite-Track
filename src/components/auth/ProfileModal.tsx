import React, { useState } from "react";
import { X } from "lucide-react";
import { motion } from "motion/react";
import { authService } from "../../services/authService";
import { userService } from "../../services/userService";
import type { User } from "../../types";

interface ProfileModalProps {
  user: User;
  onClose: () => void;
  onSave: (updated: User) => void;
}

export function ProfileModal({ user, onClose, onSave }: ProfileModalProps) {
  const [tab, setTab] = useState<"profile" | "password">("profile");
  const [form, setForm] = useState({
    username: user.username,
    first_name: user.first_name,
    last_name: user.last_name,
    role: user.role,
    department_id: user.department_id || (undefined as number | undefined),
    position: user.position,
  });
  const [pwForm, setPwForm] = useState({ old_password: "", new_password: "", confirm_password: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await userService.updateUser(user.id, {
        username: form.username,
        first_name: form.first_name,
        last_name: form.last_name,
        role: form.role,
        department_id: form.department_id,
        position: form.position,
      });
      const updated = await userService.getUser(user.id);
      onSave(updated);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwForm.new_password !== pwForm.confirm_password) {
      setError("รหัสผ่านใหม่ไม่ตรงกัน");
      return;
    }
    setSaving(true);
    try {
      await authService.changePassword(user.id, pwForm.old_password, pwForm.new_password);
      setSuccess("เปลี่ยนรหัสผ่านสำเร็จ");
      setPwForm({ old_password: "", new_password: "", confirm_password: "" });
      setError("");
    } catch (e: any) {
      setError(e.message);
      setSuccess("");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
      >
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-xl font-serif font-bold">โปรไฟล์</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        <div className="flex border-b border-gray-100">
          <button
            onClick={() => { setTab("profile"); setError(""); setSuccess(""); }}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${tab === "profile" ? "text-[#5A5A40] border-b-2 border-[#5A5A40]" : "text-gray-400"}`}
          >
            ข้อมูลส่วนตัว
          </button>
          <button
            onClick={() => { setTab("password"); setError(""); setSuccess(""); }}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${tab === "password" ? "text-[#5A5A40] border-b-2 border-[#5A5A40]" : "text-gray-400"}`}
          >
            เปลี่ยนรหัสผ่าน
          </button>
        </div>

        {error && <div className="mx-6 mt-4 bg-red-50 text-red-600 text-sm p-3 rounded-xl">{error}</div>}
        {success && <div className="mx-6 mt-4 bg-emerald-50 text-emerald-600 text-sm p-3 rounded-xl">{success}</div>}

        {tab === "profile" ? (
          <form onSubmit={handleSaveProfile} className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-400 mb-1">ชื่อ</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] outline-none"
                  value={form.first_name}
                  onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-gray-400 mb-1">นามสกุล</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] outline-none"
                  value={form.last_name}
                  onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-gray-400 mb-1">ตำแหน่ง</label>
              <input
                type="text"
                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] outline-none"
                value={form.position}
                onChange={(e) => setForm({ ...form, position: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button type="button" onClick={onClose} className="px-6 py-2 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100">
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-[#5A5A40] text-white rounded-xl text-sm font-bold shadow-lg hover:bg-[#4A4A30] disabled:opacity-50"
              >
                บันทึก
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleChangePassword} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-gray-400 mb-1">รหัสผ่านเดิม</label>
              <input
                type="password"
                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] outline-none"
                value={pwForm.old_password}
                onChange={(e) => setPwForm({ ...pwForm, old_password: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-gray-400 mb-1">รหัสผ่านใหม่</label>
              <input
                type="password"
                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] outline-none"
                value={pwForm.new_password}
                onChange={(e) => setPwForm({ ...pwForm, new_password: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-gray-400 mb-1">ยืนยันรหัสผ่านใหม่</label>
              <input
                type="password"
                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] outline-none"
                value={pwForm.confirm_password}
                onChange={(e) => setPwForm({ ...pwForm, confirm_password: e.target.value })}
                required
              />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button type="button" onClick={onClose} className="px-6 py-2 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100">
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-[#5A5A40] text-white rounded-xl text-sm font-bold shadow-lg hover:bg-[#4A4A30] disabled:opacity-50"
              >
                เปลี่ยนรหัสผ่าน
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}
