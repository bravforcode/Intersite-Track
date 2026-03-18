import { supabase } from "../lib/supabase";
import api from "./api";
import type { User } from "../types";

export interface LoginCredentials {
  email: string;
  password: string;
}

function normalizeAuthMessage(message: string, fallback: string): string {
  const raw = message.trim();

  if (!raw) return fallback;
  if (raw.includes("Email not confirmed")) return "อีเมลนี้ยังไม่ได้ยืนยัน";
  if (raw.includes("Invalid login credentials")) return "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
  if (raw.includes("already registered")) return "อีเมลนี้มีอยู่ในระบบแล้ว";
  if (raw.includes("Failed to fetch") || raw.includes("Load failed") || raw.includes("NetworkError")) {
    return "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง";
  }
  if (raw.includes("ไม่พบข้อมูลผู้ใช้")) {
    return "บัญชีนี้ยังไม่พร้อมใช้งาน กรุณาลองเข้าสู่ระบบอีกครั้ง";
  }

  return raw;
}

function getAuthErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    return normalizeAuthMessage(error.message, fallback);
  }
  return fallback;
}

async function fetchAndStoreProfile(profileLoadErrorMessage: string): Promise<User> {
  try {
    const profile = await api.post<User>("/api/auth/profile", {});
    const { data } = await supabase.auth.getSession();
    const user = { ...profile, token: data.session?.access_token ?? "" };
    localStorage.setItem("user", JSON.stringify(user));
    return user;
  } catch (error) {
    throw new Error(getAuthErrorMessage(error, profileLoadErrorMessage));
  }
}

export const authService = {
  /**
   * Sign up: create Supabase Auth account + app profile, then auto-login
   */
  async signUp(email: string, password: string): Promise<User> {
    try {
      await api.post("/api/auth/signup", { email, password });
    } catch (error) {
      throw new Error(getAuthErrorMessage(error, "ยังไม่สามารถสร้างบัญชีได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง"));
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      throw new Error(getAuthErrorMessage(error, "สมัครสมาชิกสำเร็จแล้ว แต่ยังไม่สามารถเข้าสู่ระบบอัตโนมัติได้"));
    }

    if (!data.session) throw new Error("ไม่สามารถสร้าง session ได้");

    return fetchAndStoreProfile("สร้างบัญชีสำเร็จแล้ว แต่ยังโหลดข้อมูลผู้ใช้ไม่ได้ กรุณาเข้าสู่ระบบอีกครั้ง");
  },

  /**
   * Sign in via Supabase Auth, then fetch app profile (role, dept) from backend.
   */
  async signIn(email: string, password: string): Promise<User> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      throw new Error(getAuthErrorMessage(error, "ยังไม่สามารถเข้าสู่ระบบได้ในขณะนี้"));
    }

    if (!data.session) throw new Error("ไม่สามารถสร้าง session ได้");

    return fetchAndStoreProfile("เข้าสู่ระบบสำเร็จแล้ว แต่ยังโหลดข้อมูลผู้ใช้ไม่ได้ กรุณาลองใหม่อีกครั้ง");
  },

  async signOut(): Promise<void> {
    await supabase.auth.signOut();
    localStorage.removeItem("user");
  },

  async getToken(): Promise<string | null> {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  },

  getStoredUser(): User | null {
    try {
      const stored = localStorage.getItem("user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  },

  async resetPassword(email: string): Promise<void> {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/`,
    });
    if (error) throw new Error(error.message);
  },

  async resendVerification(email: string): Promise<void> {
    const { error } = await supabase.auth.resend({ type: "signup", email });
    if (error) throw new Error(error.message);
  },

  /** Fetch app profile from backend and store it (used after auth state change) */
  async fetchProfile(): Promise<User> {
    return fetchAndStoreProfile("ยังไม่สามารถโหลดข้อมูลผู้ใช้ได้ กรุณาลองใหม่อีกครั้ง");
  },

  /** Change password via backend Supabase Admin API */
  async changePassword(userId: number, _oldPassword: string, newPassword: string): Promise<void> {
    await api.put(`/api/users/${userId}/password`, { new_password: newPassword });
  },
};

export default authService;
