import { supabase } from "../lib/supabase";
import api from "./api";
import type { User } from "../types";

export interface LoginCredentials {
  email: string;
  password: string;
}

export const authService = {
  /**
   * Sign in via Supabase Auth, then fetch app profile (role, dept) from backend.
   */
  async signIn(email: string, password: string): Promise<User> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      if (error.message.includes("Email not confirmed")) {
        throw new Error("กรุณายืนยันอีเมลของคุณก่อนเข้าสู่ระบบ");
      }
      if (error.message.includes("Invalid login credentials")) {
        throw new Error("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
      }
      throw new Error(error.message);
    }

    if (!data.session) throw new Error("ไม่สามารถสร้าง session ได้");

    const profile = await api.post<User>("/api/auth/profile", {});
    const user = { ...profile, token: data.session.access_token };
    localStorage.setItem("user", JSON.stringify(user));
    return user;
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
    const profile = await api.post<User>("/api/auth/profile", {});
    const { data } = await supabase.auth.getSession();
    const user = { ...profile, token: data.session?.access_token ?? "" };
    localStorage.setItem("user", JSON.stringify(user));
    return user;
  },

  /** Change password via backend Supabase Admin API */
  async changePassword(userId: number, _oldPassword: string, newPassword: string): Promise<void> {
    await api.put(`/api/users/${userId}/password`, { new_password: newPassword });
  },
};

export default authService;
