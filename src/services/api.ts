import { supabase } from "../lib/supabase";

const BASE_URL = "";

async function getToken(): Promise<string | null> {
  // Always use live Supabase session (auto-refreshes tokens)
  const { data } = await supabase.auth.getSession();
  if (data.session?.access_token) return data.session.access_token;
  // Fallback for any cached token
  try {
    const user = localStorage.getItem("user");
    if (user) return JSON.parse(user).token ?? null;
  } catch {}
  return null;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers });

  if (res.status === 401) {
    await supabase.auth.signOut();
    localStorage.removeItem("user");
    window.location.href = "/";
    throw new Error("เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่");
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "เกิดข้อผิดพลาด" }));
    throw new Error(err.error || "เกิดข้อผิดพลาด");
  }

  return res.json();
}

export const api = {
  get: <T>(url: string) => request<T>(url),
  post: <T>(url: string, data: unknown) =>
    request<T>(url, { method: "POST", body: JSON.stringify(data) }),
  put: <T>(url: string, data: unknown) =>
    request<T>(url, { method: "PUT", body: JSON.stringify(data) }),
  patch: <T>(url: string, data?: unknown) =>
    request<T>(url, { method: "PATCH", body: data ? JSON.stringify(data) : undefined }),
  delete: <T>(url: string) => request<T>(url, { method: "DELETE" }),
};

export default api;
