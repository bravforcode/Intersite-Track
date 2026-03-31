import React, { useState } from "react";
import { ClipboardList, Loader2, Mail, Lock, Eye, EyeOff, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { authService } from "../../services/authService";
import { features } from "../../config/features";
import type { User } from "../../types";

interface LoginPageProps {
  onLogin: (user: User) => void;
}

type View = "login" | "signup" | "forgotPassword" | "verifyNotice";

interface QuickLoginAccount {
  label: string;
  subtitle: string;
  email: string;
  password: string;
}

const QUICK_LOGIN_ACCOUNTS: QuickLoginAccount[] = [
  {
    label: "ผู้ดูแลระบบ (Admin)",
    subtitle: "admin@taskam.local",
    email: "admin@taskam.local",
    password: "admin123",
  },
  {
    label: "พนักงาน (Staff)",
    subtitle: "somchai@taskam.local",
    email: "somchai@taskam.local",
    password: "staff123",
  },
];

const primaryGradient = "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)";
const logoGradient = "linear-gradient(145deg, #38BDF8 0%, #2563EB 55%, #1E40AF 100%)";

const inputClass =
  "w-full pl-10 pr-4 py-3 rounded-xl bg-sky-50 border border-sky-100 text-slate-900 placeholder-slate-400 focus:border-[#2563EB] focus:bg-white focus:ring-2 focus:ring-[#2563EB]/15 outline-none transition-all text-sm";

const inputClassPr = inputClass.replace("pr-4", "pr-10");

const labelClass =
  "block text-[11px] font-semibold uppercase tracking-widest text-sky-700/70 mb-1.5 ml-1";

const iconClass = "absolute left-3.5 top-1/2 -translate-y-1/2 text-sky-700/45 w-4 h-4";

const infoBoxClass =
  "bg-emerald-50 text-emerald-700 text-sm p-3 rounded-xl text-center border border-emerald-100";

const errorBoxClass =
  "bg-red-50 text-red-600 text-sm p-3 rounded-xl text-center border border-red-100";

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

  const submitLogin = async (loginEmail: string, loginPassword: string) => {
    setLoading(true);
    setError("");
    setInfo("");

    try {
      const normalizedEmail = loginEmail.trim().toLowerCase();
      setEmail(normalizedEmail);
      setPassword(loginPassword);

      const user = await authService.signIn(normalizedEmail, loginPassword);
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

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setInfo("");
    try {
      const normalizedEmail = email.trim().toLowerCase();
      setEmail(normalizedEmail);

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

      const user = await authService.signUp(normalizedEmail, password);
      setInfo("");
      setPassword("");
      setConfirmPassword("");
      onLogin(user);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
      if (msg.includes("อีเมลนี้มีอยู่ในระบบแล้ว")) {
        setView("login");
        setInfo("อีเมลนี้มีอยู่ในระบบแล้ว กรุณาเข้าสู่ระบบด้วยรหัสผ่านของคุณ");
        setPassword("");
        setConfirmPassword("");
        return;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitLogin(email, password);
  };

  const handleQuickLogin = async (account: QuickLoginAccount) => {
    setEmail(account.email);
    setPassword(account.password);
    await submitLogin(account.email, account.password);
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

  const goTo = (nextView: View) => {
    setView(nextView);
    setError("");
    setInfo("");
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 45%, #BFDBFE 100%)",
      }}
    >
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-28 -right-24 w-[28rem] h-[28rem] rounded-full bg-sky-300/25 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-[24rem] h-[24rem] rounded-full bg-blue-400/18 blur-3xl" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[36rem] h-[36rem] rounded-full bg-white/40 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.4),transparent_40%)]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
        className="relative bg-white/88 backdrop-blur-xl p-10 rounded-[2rem] shadow-2xl shadow-blue-500/12 w-full max-w-md ring-1 ring-blue-200/60"
      >
        <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-sky-300/70 to-transparent" />

        <div className="flex flex-col items-center mb-10">
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              delay: 0.1,
              duration: 0.4,
              type: "spring",
              stiffness: 180,
              damping: 14,
            }}
            className="w-20 h-20 rounded-[1.4rem] flex items-center justify-center mb-5 shadow-xl shadow-blue-500/25"
            style={{ background: logoGradient }}
          >
            <ClipboardList className="text-white w-10 h-10" />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.3 }}
            className="text-center"
          >
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900 leading-none">
              Intersite Track
            </h1>
            <p className="text-sky-800/70 text-sm mt-2 tracking-wide font-light">
              ระบบบริหารจัดการงาน
            </p>
          </motion.div>
        </div>

        <AnimatePresence mode="wait">
          {view === "login" && (
            <motion.div
              key="login"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.22 }}
            >
              {info && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`${infoBoxClass} mb-5`}
                >
                  {info}
                </motion.div>
              )}

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`${errorBoxClass} mb-5`}
                >
                  {error}
                </motion.div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className={labelClass}>อีเมล</label>
                  <div className="relative">
                    <Mail className={iconClass} />
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
                    <label className={labelClass.replace(" mb-1.5 ml-1", "")}>รหัสผ่าน</label>
                    <button
                      type="button"
                      onClick={() => goTo("forgotPassword")}
                      className="text-xs text-blue-600 hover:text-blue-800 hover:underline underline-offset-2 transition-colors"
                    >
                      ลืมรหัสผ่าน?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className={iconClass} />
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
                      onClick={() => setShowPassword(prev => !prev)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sky-700/45 hover:text-blue-700 transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full text-white py-3.5 rounded-xl font-semibold shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all mt-2 disabled:opacity-50 flex items-center justify-center gap-2 text-sm tracking-wide"
                  style={{ background: primaryGradient }}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      กำลังเข้าสู่ระบบ...
                    </>
                  ) : (
                    "เข้าสู่ระบบ"
                  )}
                </motion.button>
              </form>

              {features.quickLogin.enabled && (
                <div className="mt-6 pt-6 border-t border-sky-100">
                  <div className="flex items-center justify-center gap-2 text-center mb-4">
                    <Sparkles className="w-4 h-4 text-blue-500" />
                    <p className="text-sm font-semibold text-slate-900">
                      ทดสอบเข้าสู่ระบบ (คลิกเพื่อเข้า)
                    </p>
                  </div>
                  <div className="space-y-2">
                    {QUICK_LOGIN_ACCOUNTS.map(account => (
                      <motion.button
                        key={account.email}
                        type="button"
                        disabled={loading}
                        whileHover={{ y: -1 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => void handleQuickLogin(account)}
                        className="w-full rounded-2xl border border-sky-100 bg-gradient-to-r from-sky-50 via-white to-blue-50 px-4 py-3 text-left transition-all hover:border-blue-200 hover:shadow-md hover:shadow-blue-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{account.label}</p>
                            <p className="text-xs text-sky-700/70 mt-1">{account.subtitle}</p>
                          </div>
                          {loading ? (
                            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                          ) : (
                            <span className="text-xs font-semibold text-blue-600">เข้าสู่ระบบ</span>
                          )}
                        </div>
                      </motion.button>
                    ))}
                  </div>
                  <p className="text-[11px] text-sky-700/65 text-center mt-3">
                    แสดงเฉพาะ development หรือ staging เท่านั้น
                  </p>
                </div>
              )}

              <div className="mt-6 text-center">
                <span className="text-sm text-slate-500">ยังไม่มีบัญชี? </span>
                <button
                  type="button"
                  onClick={() => goTo("signup")}
                  className="text-sm text-blue-600 font-semibold hover:text-blue-800 hover:underline underline-offset-2 transition-colors"
                >
                  สร้างบัญชีใหม่
                </button>
              </div>
            </motion.div>
          )}

          {view === "signup" && (
            <motion.div
              key="signup"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.22 }}
            >
              {info && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`${infoBoxClass} mb-5`}
                >
                  {info}
                </motion.div>
              )}

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`${errorBoxClass} mb-5`}
                >
                  {error}
                </motion.div>
              )}

              <form onSubmit={handleSignUp} className="space-y-4">
                <div>
                  <label className={labelClass}>อีเมล</label>
                  <div className="relative">
                    <Mail className={iconClass} />
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
                  <label className={labelClass}>รหัสผ่าน</label>
                  <div className="relative">
                    <Lock className={iconClass} />
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
                      onClick={() => setShowPassword(prev => !prev)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sky-700/45 hover:text-blue-700 transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>ยืนยันรหัสผ่าน</label>
                  <div className="relative">
                    <Lock className={iconClass} />
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
                      onClick={() => setShowConfirmPassword(prev => !prev)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sky-700/45 hover:text-blue-700 transition-colors"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full text-white py-3.5 rounded-xl font-semibold shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all mt-2 disabled:opacity-50 flex items-center justify-center gap-2 text-sm tracking-wide"
                  style={{ background: primaryGradient }}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      กำลังสร้างบัญชี...
                    </>
                  ) : (
                    "สร้างบัญชี"
                  )}
                </motion.button>
              </form>

              <p className="mt-4 text-center text-xs text-slate-500">
                สร้างบัญชีแล้วระบบจะพาเข้าใช้งานทันทีด้วยอีเมลและรหัสผ่านนี้
              </p>

              <button
                onClick={() => {
                  goTo("login");
                  setPassword("");
                  setConfirmPassword("");
                }}
                className="mt-5 w-full text-sm text-slate-500 hover:text-blue-700 transition-colors"
              >
                ← กลับไปหน้าเข้าสู่ระบบ
              </button>
            </motion.div>
          )}

          {view === "forgotPassword" && (
            <motion.div
              key="forgot"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.22 }}
            >
              <h2 className="text-lg font-semibold text-slate-900 mb-1">รีเซ็ตรหัสผ่าน</h2>
              <p className="text-sm text-slate-500 mb-5 leading-relaxed">
                กรอกอีเมลของคุณ เราจะส่งลิงก์รีเซ็ตรหัสผ่านให้
              </p>

              {error && <div className={`${errorBoxClass} mb-4`}>{error}</div>}
              {info && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`${infoBoxClass} mb-4`}
                >
                  {info}
                </motion.div>
              )}

              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="relative">
                  <Mail className={iconClass} />
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
                  className="w-full text-white py-3.5 rounded-xl font-semibold shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm tracking-wide"
                  style={{ background: primaryGradient }}
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  ส่งลิงก์รีเซ็ต
                </motion.button>
              </form>

              <button
                onClick={() => goTo("login")}
                className="mt-5 w-full text-sm text-slate-500 hover:text-blue-700 transition-colors"
              >
                ← กลับไปหน้าเข้าสู่ระบบ
              </button>
            </motion.div>
          )}

          {view === "verifyNotice" && (
            <motion.div
              key="verify"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.22 }}
              className="text-center"
            >
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-blue-100">
                <Mail className="w-8 h-8 text-blue-500" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900 mb-2">ยืนยันอีเมลของคุณ</h2>
              <p className="text-sm text-slate-500 mb-5 leading-relaxed">
                กรุณาตรวจสอบอีเมล <span className="font-semibold text-slate-900">{email}</span>{" "}
                และคลิกลิงก์ยืนยันก่อนเข้าสู่ระบบ
              </p>

              {info && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`${infoBoxClass} mb-4`}
                >
                  {info}
                </motion.div>
              )}
              {error && <div className={`${errorBoxClass} mb-4`}>{error}</div>}

              <motion.button
                onClick={handleResendVerification}
                disabled={loading || !email}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="w-full text-white py-3.5 rounded-xl font-semibold shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2 mb-4 text-sm tracking-wide"
                style={{ background: primaryGradient }}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                ส่งอีเมลยืนยันอีกครั้ง
              </motion.button>

              <button
                onClick={() => goTo("login")}
                className="w-full text-sm text-slate-500 hover:text-blue-700 transition-colors"
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
