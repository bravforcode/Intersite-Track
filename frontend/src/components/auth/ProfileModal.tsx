import React, { useState } from "react";
import { Link2, X } from "lucide-react";
import { motion } from "motion/react";
import { authService } from "../../services/authService";
import { userService } from "../../services/userService";
import type { User } from "../../types";

interface ProfileModalProps {
  user: User;
  onClose: () => void;
  onSave: (updated: User) => void;
  onOpenLineLink: () => void;
}

function maskLineId(value: string | null | undefined): string {
  if (!value) return "ยังไม่ได้เชื่อม LINE";
  if (value.length <= 10) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

export function ProfileModal({ user, onClose, onSave, onOpenLineLink }: ProfileModalProps) {
  const [tab, setTab] = useState<"profile" | "password">("profile");
  const [form, setForm] = useState({
    username: user.username ?? "",
    first_name: user.first_name ?? "",
    last_name: user.last_name ?? "",
    position: user.position ?? "",
  });
  const [pwForm, setPwForm] = useState({ old_password: "", new_password: "", confirm_password: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const updated = await userService.updateMyProfile({
        username: form.username,
        first_name: form.first_name,
        last_name: form.last_name,
        position: form.position.trim(),
        line_user_id: user.line_user_id ?? null,
      });
      onSave(updated);
      setSuccess("บันทึกโปรไฟล์สำเร็จ");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "ไม่สามารถบันทึกโปรไฟล์ได้";
      setError(message);
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
    setError("");
    setSuccess("");
    try {
      await authService.changePassword(user.id, pwForm.old_password, pwForm.new_password);
      setSuccess("เปลี่ยนรหัสผ่านสำเร็จ");
      setPwForm({ old_password: "", new_password: "", confirm_password: "" });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "ไม่สามารถเปลี่ยนรหัสผ่านได้";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const switchTab = (nextTab: "profile" | "password") => {
    setTab(nextTab);
    setError("");
    setSuccess("");
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white/95 rounded-4xl shadow-[0_28px_70px_rgba(37,99,235,0.16)] ring-1 ring-sky-100 w-full max-w-lg overflow-hidden"
      >
        <div className="p-6 border-b border-sky-100 flex items-center justify-between bg-linear-to-r from-white via-sky-50/80 to-blue-50/70">
          <h3 className="text-xl font-serif font-bold">โปรไฟล์</h3>
          <button onClick={onClose} className="text-sky-400 hover:text-blue-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex border-b border-sky-100 bg-white">
          <button
            onClick={() => switchTab("profile")}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${tab === "profile" ? "text-blue-700 border-b-2 border-blue-600 bg-blue-50/60" : "text-slate-400 hover:text-slate-600"}`}
          >
            ข้อมูลส่วนตัว
          </button>
          <button
            onClick={() => switchTab("password")}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${tab === "password" ? "text-blue-700 border-b-2 border-blue-600 bg-blue-50/60" : "text-slate-400 hover:text-slate-600"}`}
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
                  className="w-full px-4 py-2.5 rounded-xl border border-sky-100 bg-sky-50/70 focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 outline-none transition-colors"
                  value={form.first_name}
                  onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-gray-400 mb-1">นามสกุล</label>
                <input
                  type="text"
                  className="w-full px-4 py-2.5 rounded-xl border border-sky-100 bg-sky-50/70 focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 outline-none transition-colors"
                  value={form.last_name}
                  onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-gray-400 mb-1">ชื่อผู้ใช้</label>
              <input
                type="text"
                className="w-full px-4 py-2.5 rounded-xl border border-sky-100 bg-sky-50/70 focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 outline-none transition-colors"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-gray-400 mb-1">ตำแหน่ง</label>
              <input
                type="text"
                className="w-full px-4 py-2.5 rounded-xl border border-sky-100 bg-sky-50/70 focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 outline-none transition-colors"
                value={form.position}
                onChange={(e) => setForm({ ...form, position: e.target.value })}
              />
            </div>
            <div className="rounded-2xl border border-sky-100 bg-sky-50/70 px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-sky-700/70 mb-1">LINE ที่เชื่อมอยู่</p>
                  <p className="text-sm text-slate-700">{maskLineId(user.line_user_id)}</p>
                </div>
                <button
                  type="button"
                  onClick={onOpenLineLink}
                  className="inline-flex items-center gap-2 rounded-xl border border-sky-100 bg-white px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-sky-50 transition-colors"
                >
                  <Link2 size={16} />
                  จัดการ LINE
                </button>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button type="button" onClick={onClose} className="px-6 py-2 rounded-xl text-sm font-bold text-slate-500 hover:bg-sky-50 transition-colors">
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 disabled:opacity-50 transition-colors"
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
                className="w-full px-4 py-2.5 rounded-xl border border-sky-100 bg-sky-50/70 focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 outline-none transition-colors"
                value={pwForm.old_password}
                onChange={(e) => setPwForm({ ...pwForm, old_password: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-gray-400 mb-1">รหัสผ่านใหม่</label>
              <input
                type="password"
                className="w-full px-4 py-2.5 rounded-xl border border-sky-100 bg-sky-50/70 focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 outline-none transition-colors"
                value={pwForm.new_password}
                onChange={(e) => setPwForm({ ...pwForm, new_password: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-gray-400 mb-1">ยืนยันรหัสผ่านใหม่</label>
              <input
                type="password"
                className="w-full px-4 py-2.5 rounded-xl border border-sky-100 bg-sky-50/70 focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 outline-none transition-colors"
                value={pwForm.confirm_password}
                onChange={(e) => setPwForm({ ...pwForm, confirm_password: e.target.value })}
                required
              />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button type="button" onClick={onClose} className="px-6 py-2 rounded-xl text-sm font-bold text-slate-500 hover:bg-sky-50 transition-colors">
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 disabled:opacity-50 transition-colors"
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
