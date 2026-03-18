import React, { useState } from "react";
import { ClipboardList, Loader2, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { authService } from "../../services/authService";
import type { User } from "../../types";

interface LoginPageProps {
  onLogin: (user: User) => void;
}

type View = "login" | "signup" | "forgotPassword" | "verifyNotice";

const inputClass =
  "w-full pl-10 pr-4 py-3 rounded-xl bg-stone-50 border border-stone-200 text-[#1a1a1a] placeholder-stone-400 focus:border-[#5A5A40] focus:bg-white focus:ring-2 focus:ring-[#5A5A40]/15 outline-none transition-all text-sm";

const inputClassPr = inputClass.replace("pr-4", "pr-10");

export function LoginPage({ onLogin }: LoginPageProps) {
  const [view, setView] = useState<View>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (password !== confirmPassword) {
        setError("รหัสผ่านไม่ตรงกัน");
        setLoading(false);
        return;
      }
      if (password.length < 8) {
        setError("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร");
        setLoading(false);
        return;
      }

      const user = await authService.signUp(email, password);
      setInfo("");
      setPassword("");
      setConfirmPassword("");
      onLogin(user);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  };

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

  const goTo = (v: View) => {
    setView(v);
    setError("");
    setInfo("");
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, #EFEDE5 0%, #F5F3EB 50%, #E9E7DE 100%)" }}
    >
      {/* Decorative ambient blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-[#5A5A40]/8 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-[#5A5A40]/6 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-white/20 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
        className="relative bg-white/88 backdrop-blur-md p-10 rounded-3xl shadow-2xl shadow-stone-400/20 w-full max-w-md ring-1 ring-black/6"
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.4, type: "spring", stiffness: 180, damping: 14 }}
            className="w-20 h-20 rounded-2xl flex items-center justify-center mb-5 shadow-xl shadow-[#5A5A40]/25"
            style={{ background: "linear-gradient(145deg, #6B6B50, #3E3E2C)" }}
          >
            <ClipboardList className="text-white w-10 h-10" />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.3 }}
            className="text-center"
          >
            <h1 className="text-3xl font-serif font-semibold tracking-tight text-[#1a1a1a] leading-none">
              Intersite Track
            </h1>
            <p className="text-stone-400 text-sm mt-2 tracking-wide font-light" style={{ fontFamily: "'Sarabun', sans-serif" }}>
              ระบบบริหารจัดการงาน
            </p>
          </motion.div>
        </div>

        <AnimatePresence mode="wait">
          {/* ─── LOGIN VIEW ─── */}
          {view === "login" && (
            <motion.div
              key="login"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.22 }}
            >
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-50 text-red-600 text-sm p-3 rounded-xl mb-5 text-center border border-red-100"
                >
                  {error}
                </motion.div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-widest text-stone-400 mb-1.5 ml-1">
                    อีเมล
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 w-4 h-4" />
                    <input
                      type="email"
                      autoComplete="email"
                      className={inputClass}
                      placeholder="กรอกอีเมลของคุณ"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5 ml-1">
                    <label className="block text-[11px] font-semibold uppercase tracking-widest text-stone-400">
                      รหัสผ่าน
                    </label>
                    <button
                      type="button"
                      onClick={() => goTo("forgotPassword")}
                      className="text-xs text-[#5A5A40] hover:text-[#3E3E2C] hover:underline underline-offset-2 transition-colors"
                    >
                      ลืมรหัสผ่าน?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 w-4 h-4" />
                    <input
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      className={inputClassPr}
                      placeholder="กรอกรหัสผ่าน"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(p => !p)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors"
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
                  className="w-full text-white py-3.5 rounded-xl font-semibold shadow-lg shadow-[#5A5A40]/30 hover:shadow-xl hover:shadow-[#5A5A40]/40 transition-all mt-2 disabled:opacity-50 flex items-center justify-center gap-2 text-sm tracking-wide"
                  style={{ background: "linear-gradient(135deg, #5A5A40, #3E3E2C)" }}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      กำลังเข้าสู่ระบบ...
                    </>
                  ) : "เข้าสู่ระบบ"}
                </motion.button>
              </form>

              <div className="mt-6 text-center">
                <span className="text-sm text-stone-400">ยังไม่มีบัญชี? </span>
                <button
                  type="button"
                  onClick={() => goTo("signup")}
                  className="text-sm text-[#5A5A40] font-semibold hover:text-[#3E3E2C] hover:underline underline-offset-2 transition-colors"
                >
                  สร้างบัญชีใหม่
                </button>
              </div>
            </motion.div>
          )}

          {/* ─── SIGNUP VIEW ─── */}
          {view === "signup" && (
            <motion.div
              key="signup"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.22 }}
            >
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-50 text-red-600 text-sm p-3 rounded-xl mb-5 text-center border border-red-100"
                >
                  {error}
                </motion.div>
              )}

              <form onSubmit={handleSignUp} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-widest text-stone-400 mb-1.5 ml-1">
                    อีเมล
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 w-4 h-4" />
                    <input
                      type="email"
                      autoComplete="email"
                      className={inputClass}
                      placeholder="กรอกอีเมลของคุณ"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-widest text-stone-400 mb-1.5 ml-1">
                    รหัสผ่าน
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 w-4 h-4" />
                    <input
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      className={inputClassPr}
                      placeholder="อย่างน้อย 8 ตัวอักษร"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(p => !p)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-widest text-stone-400 mb-1.5 ml-1">
                    ยืนยันรหัสผ่าน
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 w-4 h-4" />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      autoComplete="new-password"
                      className={inputClassPr}
                      placeholder="กรอกรหัสผ่านอีกครั้ง"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(p => !p)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full text-white py-3.5 rounded-xl font-semibold shadow-lg shadow-[#5A5A40]/30 hover:shadow-xl hover:shadow-[#5A5A40]/40 transition-all mt-2 disabled:opacity-50 flex items-center justify-center gap-2 text-sm tracking-wide"
                  style={{ background: "linear-gradient(135deg, #5A5A40, #3E3E2C)" }}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      กำลังสร้างบัญชี...
                    </>
                  ) : "สร้างบัญชี"}
                </motion.button>
              </form>

              <button
                onClick={() => { goTo("login"); setPassword(""); setConfirmPassword(""); }}
                className="mt-5 w-full text-sm text-stone-400 hover:text-[#5A5A40] transition-colors"
              >
                ← กลับไปหน้าเข้าสู่ระบบ
              </button>
            </motion.div>
          )}

          {/* ─── FORGOT PASSWORD VIEW ─── */}
          {view === "forgotPassword" && (
            <motion.div
              key="forgot"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.22 }}
            >
              <h2 className="text-lg font-semibold text-[#1a1a1a] mb-1">รีเซ็ตรหัสผ่าน</h2>
              <p className="text-sm text-stone-400 mb-5 leading-relaxed">
                กรอกอีเมลของคุณ เราจะส่งลิงก์รีเซ็ตรหัสผ่านให้
              </p>

              {error && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl mb-4 text-center border border-red-100">{error}</div>
              )}
              {info && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-emerald-50 text-emerald-700 text-sm p-3 rounded-xl mb-4 text-center border border-emerald-100"
                >
                  {info}
                </motion.div>
              )}

              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 w-4 h-4" />
                  <input
                    type="email"
                    autoComplete="email"
                    className={inputClass}
                    placeholder="กรอกอีเมลของคุณ"
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
                  className="w-full text-white py-3.5 rounded-xl font-semibold shadow-lg shadow-[#5A5A40]/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm tracking-wide"
                  style={{ background: "linear-gradient(135deg, #5A5A40, #3E3E2C)" }}
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  ส่งลิงก์รีเซ็ต
                </motion.button>
              </form>

              <button
                onClick={() => goTo("login")}
                className="mt-5 w-full text-sm text-stone-400 hover:text-[#5A5A40] transition-colors"
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
              transition={{ duration: 0.22 }}
              className="text-center"
            >
              <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-amber-100">
                <Mail className="w-8 h-8 text-amber-500" />
              </div>
              <h2 className="text-lg font-semibold text-[#1a1a1a] mb-2">ยืนยันอีเมลของคุณ</h2>
              <p className="text-sm text-stone-400 mb-5 leading-relaxed">
                กรุณาตรวจสอบอีเมล{" "}
                <span className="font-semibold text-[#1a1a1a]">{email}</span>{" "}
                และคลิกลิงก์ยืนยันก่อนเข้าสู่ระบบ
              </p>

              {info && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-emerald-50 text-emerald-700 text-sm p-3 rounded-xl mb-4 border border-emerald-100"
                >
                  {info}
                </motion.div>
              )}
              {error && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl mb-4 border border-red-100">{error}</div>
              )}

              <motion.button
                onClick={handleResendVerification}
                disabled={loading || !email}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="w-full text-white py-3.5 rounded-xl font-semibold shadow-lg shadow-[#5A5A40]/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2 mb-4 text-sm tracking-wide"
                style={{ background: "linear-gradient(135deg, #5A5A40, #3E3E2C)" }}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                ส่งอีเมลยืนยันอีกครั้ง
              </motion.button>

              <button
                onClick={() => goTo("login")}
                className="w-full text-sm text-stone-400 hover:text-[#5A5A40] transition-colors"
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
