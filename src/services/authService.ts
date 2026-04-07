import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  type User as FirebaseUser,
} from "firebase/auth";
import { auth } from "../lib/firebase";
import api, { clearApiAuthState, setCachedAccessToken } from "./api";
import type { User } from "../types";

export interface LoginCredentials {
  email: string;
  password: string;
}

function normalizeAuthMessage(message: string, fallback: string): string {
  const raw = message.trim();
  if (!raw) return fallback;
  if (raw.includes("auth/user-not-found") || raw.includes("auth/wrong-password") || raw.includes("auth/invalid-credential")) {
    return "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
  }
  if (raw.includes("auth/email-already-in-use")) return "อีเมลนี้มีอยู่ในระบบแล้ว";
  if (raw.includes("auth/invalid-email")) return "รูปแบบอีเมลไม่ถูกต้อง";
  if (raw.includes("auth/too-many-requests")) return "พยายามเข้าสู่ระบบบ่อยเกินไป กรุณาลองใหม่ภายหลัง";
  if (raw.includes("Failed to fetch") || raw.includes("NetworkError")) {
    return "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง";
  }
  if (raw.includes("ไม่พบข้อมูลผู้ใช้")) return "บัญชีนี้ยังไม่พร้อมใช้งาน กรุณาลองเข้าสู่ระบบอีกครั้ง";
  return raw;
}

function getAuthErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) return normalizeAuthMessage(error.message, fallback);
  return fallback;
}

async function fetchAndStoreProfile(firebaseUser: FirebaseUser, profileLoadErrorMessage: string): Promise<User> {
  try {
    const token = await firebaseUser.getIdToken();
    setCachedAccessToken(token);
    const profile = await api.post<User>("/api/auth/profile", {});
    const user = { ...profile, token };
    localStorage.setItem("user", JSON.stringify(user));
    return user;
  } catch (error) {
    clearApiAuthState();
    throw new Error(getAuthErrorMessage(error, profileLoadErrorMessage));
  }
}

export const authService = {
  /**
   * Sign up: create Firebase Auth account + app profile, then auto-login
   */
  async signUp(email: string, password: string): Promise<User> {
    try {
      await api.post("/api/auth/signup", { email, password });
    } catch (error) {
      throw new Error(getAuthErrorMessage(error, "ยังไม่สามารถสร้างบัญชีได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง"));
    }

    let credential;
    try {
      credential = await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      throw new Error(getAuthErrorMessage(error, "สมัครสมาชิกสำเร็จแล้ว แต่ยังไม่สามารถเข้าสู่ระบบอัตโนมัติได้"));
    }

    return fetchAndStoreProfile(
      credential.user,
      "สร้างบัญชีสำเร็จแล้ว แต่ยังโหลดข้อมูลผู้ใช้ไม่ได้ กรุณาเข้าสู่ระบบอีกครั้ง"
    );
  },

  /**
   * Sign in via Firebase Auth, then fetch app profile from backend.
   */
  async signIn(email: string, password: string): Promise<User> {
    let credential;
    try {
      credential = await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      throw new Error(getAuthErrorMessage(error, "ยังไม่สามารถเข้าสู่ระบบได้ในขณะนี้"));
    }

    return fetchAndStoreProfile(
      credential.user,
      "เข้าสู่ระบบสำเร็จแล้ว แต่ยังโหลดข้อมูลผู้ใช้ไม่ได้ กรุณาลองใหม่อีกครั้ง"
    );
  },

  async signOut(): Promise<void> {
    clearApiAuthState();
    localStorage.removeItem("user");
    try {
      await firebaseSignOut(auth);
    } catch {
      // UI state is already cleared locally; ignore remote sign-out failures.
    }
  },

  async getToken(): Promise<string | null> {
    const currentUser = auth.currentUser;
    if (!currentUser) return null;
    try {
      return await currentUser.getIdToken();
    } catch {
      return null;
    }
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
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      throw new Error(getAuthErrorMessage(error, "ยังไม่สามารถส่งอีเมลรีเซ็ตรหัสผ่านได้"));
    }
  },

  async resendVerification(_email: string): Promise<void> {
    // Firebase handles email verification differently; no direct resend via client SDK without user object
    throw new Error("กรุณาใช้ฟังก์ชัน resetPassword แทน");
  },

  /** Fetch app profile from backend and store it (used after auth state change) */
  async fetchProfile(): Promise<User> {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error("ไม่ได้เข้าสู่ระบบ");
    return fetchAndStoreProfile(currentUser, "ยังไม่สามารถโหลดข้อมูลผู้ใช้ได้ กรุณาลองใหม่อีกครั้ง");
  },

  /** Change password via backend Firebase Admin API */
  async changePassword(userId: string, _oldPassword: string, newPassword: string): Promise<void> {
    await api.put(`/api/users/${userId}/password`, { new_password: newPassword });
  },

  async adminResetPassword(userId: string, newPassword: string): Promise<void> {
    await api.put(`/api/users/${userId}/password`, { new_password: newPassword });
  },

  /** Subscribe to auth state changes */
  onAuthStateChanged(callback: (user: FirebaseUser | null) => void) {
    return onAuthStateChanged(auth, callback);
  },
};

export default authService;
