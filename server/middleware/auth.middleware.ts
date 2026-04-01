import { Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "../config/supabase.js";

interface AppUserRow {
  id: number;
  username: string;
  role: string;
  email: string | null;
  auth_id: string | null;
  first_name: string | null;
  last_name: string | null;
  department_id: number | null;
  position: string | null;
  created_at: string | null;
}

const AUTH_CACHE_TTL_MS = 30_000;
const authCache = new Map<
  string,
  {
    expiresAt: number;
    user: Express.Request["user"];
  }
>();

// Cleanup expired cache entries every 2 minutes to prevent memory leak
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of authCache.entries()) {
    if (val.expiresAt < now) authCache.delete(key);
  }
}, 2 * 60_000);

/**
 * Verify Supabase JWT and attach the mapped application user to req.user.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "กรุณาเข้าสู่ระบบก่อน" });
    return;
  }

  const token = authHeader.substring(7);
  const cached = authCache.get(token);

  if (cached && cached.expiresAt > Date.now()) {
    req.user = cached.user;
    next();
    return;
  }

  try {
    const {
      data: { user: authUser },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !authUser) {
      res.status(401).json({ error: "Token ไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่" });
      return;
    }

    const { data: appUser, error: profileError } = await supabaseAdmin
      .from("users")
      .select("id, username, role, email, auth_id, first_name, last_name, department_id, position, created_at")
      .eq("auth_id", authUser.id)
      .single<AppUserRow>();

    if (profileError || !appUser) {
      res.status(401).json({ error: "ไม่พบข้อมูลผู้ใช้ กรุณาติดต่อแอดมิน" });
      return;
    }

    req.user = {
      id: appUser.id,
      userId: appUser.id,
      authId: appUser.auth_id ?? authUser.id,
      email: appUser.email,
      username: appUser.username,
      role: appUser.role,
      first_name: appUser.first_name ?? "",
      last_name: appUser.last_name ?? "",
      department_id: appUser.department_id,
      department_name: null,
      position: appUser.position,
      created_at: appUser.created_at ?? undefined,
    };

    authCache.set(token, {
      expiresAt: Date.now() + AUTH_CACHE_TTL_MS,
      user: req.user,
    });

    next();
  } catch {
    res.status(401).json({ error: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่" });
  }
}

export const verifyJWT = requireAuth;

/**
 * Middleware factory to require one or more roles.
 */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "กรุณาเข้าสู่ระบบก่อน" });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: "คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้" });
      return;
    }

    next();
  };
}
