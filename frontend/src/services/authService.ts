import {
  EmailAuthProvider,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  type User as FirebaseUser,
} from "firebase/auth";
import { auth, setMockAuthUser, onMockAuthStateChanged } from "../lib/firebase";
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
  if (raw.includes("auth/visibility-check-was-unavailable")) {
    return "ไม่สามารถตรวจสอบสถานะการแสดงผลได้ กรุณาลองเข้าสู่ระบบอีกครั้ง";
  }
  if (raw.includes("auth/email-already-in-use")) return "อีเมลนี้มีอยู่ในระบบแล้ว";
  if (raw.includes("auth/invalid-email")) return "รูปแบบอีเมลไม่ถูกต้อง";
  if (raw.includes("auth/too-many-requests")) return "พยายามเข้าสู่ระบบบ่อยเกินไป กรุณาลองใหม่ภายหลัง";
  if (
    raw.includes("Failed to fetch") ||
    raw.includes("NetworkError") ||
    raw.includes("auth/network-request-failed")
  ) {
    return "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง";
  }
  if (raw.includes("ไม่พบข้อมูลผู้ใช้")) return "บัญชีนี้ยังไม่พร้อมใช้งาน กรุณาลองเข้าสู่ระบบอีกครั้ง";
  return raw;
}

function getAuthErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) return normalizeAuthMessage(error.message, fallback);
  return fallback;
}

async function warmupBackend(): Promise<void> {
  try {
    // Pre-fetch CSRF token to (1) warm up Vercel cold-start and (2) cache the token
    // so the subsequent POST /api/auth/profile doesn't need to fetch it serially.
    await api.get<unknown>("/api/csrf-token").catch(() => {});
  } catch {
    // Warmup failure is non-fatal — the actual request will retry
  }
}

async function fetchAndStoreProfile(firebaseUser: FirebaseUser, profileLoadErrorMessage: string): Promise<User> {
  try {
    const token = await firebaseUser.getIdToken();
    setCachedAccessToken(token);
    const profile = await api.post<User>("/api/auth/profile", {});
    sessionStorage.setItem("user", JSON.stringify(profile));
    return profile;
  } catch (error) {
    clearApiAuthState();
    throw new Error(getAuthErrorMessage(error, profileLoadErrorMessage));
  }
}

const isE2eMock = (import.meta.env.VITE_E2E_MOCK as string | undefined) === "1";
const firebaseAuth = auth as any;

export const authService = {
  /**
   * Sign up: create Firebase Auth account + app profile, then auto-login
   */
  async signUp(email: string, password: string): Promise<User> {
    if (isE2eMock) {
      const response = await api
        .post<{ token: string; user: User }>("/api/auth/mock-login", { email, password })
        .catch((error) => {
          throw new Error(getAuthErrorMessage(error, "ยังไม่สามารถสร้างบัญชีได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง"));
        });
      setCachedAccessToken(response.token);
      setMockAuthUser({ email, token: response.token });
      sessionStorage.setItem("user", JSON.stringify(response.user));
      return response.user;
    }

    try {
      void warmupBackend();
      await api.post("/api/auth/signup", { email, password });
    } catch (error) {
      throw new Error(getAuthErrorMessage(error, "ยังไม่สามารถสร้างบัญชีได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง"));
    }

    let credential;
    try {
      credential = await signInWithEmailAndPassword(firebaseAuth, email, password);
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
    if (isE2eMock) {
      let response: { token: string; user: User };
      try {
        response = await api.post("/api/auth/mock-login", { email, password });
      } catch (error) {
        throw new Error(getAuthErrorMessage(error, "ยังไม่สามารถเข้าสู่ระบบได้ในขณะนี้"));
      }
      setCachedAccessToken(response.token);
      setMockAuthUser({ email, token: response.token });
      sessionStorage.setItem("user", JSON.stringify(response.user));
      return response.user;
    }

    let credential;
    try {
      // Warm up the Vercel backend (cold-start) and pre-cache CSRF token
      // in parallel with nothing, so by the time Firebase auth completes
      // the backend is ready and CSRF token is cached.
      void warmupBackend();
      credential = await signInWithEmailAndPassword(firebaseAuth, email, password);
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
    sessionStorage.removeItem("user");
    if (isE2eMock) {
      setMockAuthUser(null);
      return;
    }
    try {
      await firebaseSignOut(firebaseAuth);
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
      const stored = sessionStorage.getItem("user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  },

  async resetPassword(email: string): Promise<void> {
    if (isE2eMock) {
      throw new Error("ยังไม่รองรับการรีเซ็ตรหัสผ่านในโหมดทดสอบอัตโนมัติ");
    }
    try {
      await sendPasswordResetEmail(firebaseAuth, email);
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
    const currentUser = isE2eMock ? auth.currentUser : ((firebaseAuth as any).currentUser as FirebaseUser | null);
    if (!currentUser) throw new Error("ไม่ได้เข้าสู่ระบบ");
    if (isE2eMock) {
      try {
        const token = await currentUser.getIdToken();
        setCachedAccessToken(token);
        const profile = await api.post<User>("/api/auth/profile", {});
        sessionStorage.setItem("user", JSON.stringify(profile));
        return profile;
      } catch (error) {
        clearApiAuthState();
        throw new Error(getAuthErrorMessage(error, "ยังไม่สามารถโหลดข้อมูลผู้ใช้ได้ กรุณาลองใหม่อีกครั้ง"));
      }
    }
    return fetchAndStoreProfile(currentUser as unknown as FirebaseUser, "ยังไม่สามารถโหลดข้อมูลผู้ใช้ได้ กรุณาลองใหม่อีกครั้ง");
  },

  /** Change password via backend Firebase Admin API */
  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
    const currentUser = auth.currentUser as FirebaseUser | null;
    if (!currentUser || !currentUser.email) {
      throw new Error("กรุณาเข้าสู่ระบบใหม่ก่อนเปลี่ยนรหัสผ่าน");
    }

    try {
      const credential = EmailAuthProvider.credential(currentUser.email, oldPassword);
      await reauthenticateWithCredential(currentUser, credential);
    } catch (error) {
      throw new Error(getAuthErrorMessage(error, "รหัสผ่านปัจจุบันไม่ถูกต้อง"));
    }

    await api.put(`/api/users/${userId}/password`, {
      current_password: oldPassword,
      new_password: newPassword,
    });
  },

  async adminResetPassword(userId: string, newPassword: string): Promise<void> {
    await api.put(`/api/users/${userId}/password`, { new_password: newPassword });
  },

  /** Subscribe to auth state changes */
  onAuthStateChanged(callback: (user: FirebaseUser | null) => void) {
    if (isE2eMock) {
      return onMockAuthStateChanged(callback as unknown as (user: any) => void);
    }
    return onAuthStateChanged(firebaseAuth, callback);
  },
};

export default authService;
