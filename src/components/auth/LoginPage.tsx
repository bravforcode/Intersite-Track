import React, { useState } from "react";
import { ClipboardList, Loader2, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { authService } from "../../services/authService";
import type { User } from "../../types";

interface LoginPageProps {
  onLogin: (user: User) => void;
}

type View = "login" | "forgotPassword" | "verifyNotice";

export function LoginPage({ onLogin }: LoginPageProps) {
  const [view, setView] = useState<View>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const user = await authService.signIn(email, password);
      onLogin(user);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
      if (msg.includes("ยืนยันอีเมล")) {
        setView("verifyNotice");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await authService.resetPassword(email);
      setInfo("ส่งลิงก์รีเซ็ตรหัสผ่านไปยังอีเมลของคุณแล้ว");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email) return;
    setLoading(true);
    setError("");
    try {
      await authService.resendVerification(email);
      setInfo("ส่งอีเมลยืนยันใหม่แล้ว กรุณาตรวจสอบกล่องขาเข้า");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F0] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md border border-black/5"
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.35, type: "spring", stiffness: 200 }}
            className="w-16 h-16 bg-[#5A5A40] rounded-2xl flex items-center justify-center mb-4 shadow-lg"
          >
            <ClipboardList className="text-white w-8 h-8" />
          </motion.div>
          <h1 className="text-2xl font-serif font-bold text-[#1a1a1a]">Intersite Track</h1>
          <p className="text-gray-500 text-sm mt-1">ระบบบริหารจัดการงาน</p>
        </div>

        <AnimatePresence mode="wait">
          {/* ─── LOGIN VIEW ─── */}
          {view === "login" && (
            <motion.div
              key="login"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
            >
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-50 text-red-600 text-sm p-3 rounded-xl mb-4 text-center"
                >
                  {error}
                </motion.div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1 ml-1">
                    อีเมล
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="email"
                      autoComplete="email"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] focus:border-transparent outline-none transition-all"
                      placeholder="อีเมลของคุณ"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1 ml-1">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500">
                      รหัสผ่าน
                    </label>
                    <button
                      type="button"
                      onClick={() => { setView("forgotPassword"); setError(""); setInfo(""); }}
                      className="text-xs text-[#5A5A40] hover:underline"
                    >
                      ลืมรหัสผ่าน?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      className="w-full pl-10 pr-10 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] focus:border-transparent outline-none transition-all"
                      placeholder="รหัสผ่านของคุณ"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full bg-[#5A5A40] text-white py-3 rounded-xl font-semibold shadow-lg hover:bg-[#4A4A30] transition-colors mt-2 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      กำลังเข้าสู่ระบบ...
                    </>
                  ) : "เข้าสู่ระบบ"}
                </motion.button>
              </form>
            </motion.div>
          )}

          {/* ─── FORGOT PASSWORD VIEW ─── */}
          {view === "forgotPassword" && (
            <motion.div
              key="forgot"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
            >
              <h2 className="text-lg font-semibold text-[#1a1a1a] mb-1">รีเซ็ตรหัสผ่าน</h2>
              <p className="text-sm text-gray-500 mb-4">
                กรอกอีเมลของคุณ เราจะส่งลิงก์รีเซ็ตรหัสผ่านให้
              </p>

              {error && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl mb-4 text-center">{error}</div>
              )}
              {info && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-green-50 text-green-700 text-sm p-3 rounded-xl mb-4 text-center"
                >
                  {info}
                </motion.div>
              )}

              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="email"
                    autoComplete="email"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] focus:border-transparent outline-none transition-all"
                    placeholder="อีเมลของคุณ"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                </div>
                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full bg-[#5A5A40] text-white py-3 rounded-xl font-semibold shadow-lg hover:bg-[#4A4A30] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  ส่งลิงก์รีเซ็ต
                </motion.button>
              </form>

              <button
                onClick={() => { setView("login"); setError(""); setInfo(""); }}
                className="mt-4 w-full text-sm text-gray-500 hover:text-[#5A5A40] transition-colors"
              >
                ← กลับไปหน้าเข้าสู่ระบบ
              </button>
            </motion.div>
          )}

          {/* ─── EMAIL VERIFICATION NOTICE ─── */}
          {view === "verifyNotice" && (
            <motion.div
              key="verify"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="text-center"
            >
              <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Mail className="w-7 h-7 text-amber-500" />
              </div>
              <h2 className="text-lg font-semibold text-[#1a1a1a] mb-2">ยืนยันอีเมลของคุณ</h2>
              <p className="text-sm text-gray-500 mb-2">
                กรุณาตรวจสอบอีเมล <span className="font-medium text-[#1a1a1a]">{email}</span> และคลิกลิงก์ยืนยันก่อนเข้าสู่ระบบ
              </p>

              {info && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-green-50 text-green-700 text-sm p-3 rounded-xl mb-4"
                >
                  {info}
                </motion.div>
              )}
              {error && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl mb-4">{error}</div>
              )}

              <motion.button
                onClick={handleResendVerification}
                disabled={loading || !email}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="w-full bg-[#5A5A40] text-white py-3 rounded-xl font-semibold shadow-lg hover:bg-[#4A4A30] transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mb-3"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                ส่งอีเมลยืนยันอีกครั้ง
              </motion.button>

              <button
                onClick={() => { setView("login"); setError(""); setInfo(""); }}
                className="w-full text-sm text-gray-500 hover:text-[#5A5A40] transition-colors"
              >
                ← กลับไปหน้าเข้าสู่ระบบ
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
