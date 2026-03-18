import { Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "../config/supabase.js";
import { query } from "../database/connection.js";

interface UserRow {
  id: number;
  username: string;
  role: string;
  email: string | null;
  auth_id: string | null;
}

/**
 * Verify Supabase JWT and attach app user profile to req.user
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "กรุณาเข้าสู่ระบบก่อน" });
    return;
  }

  const token = authHeader.substring(7);

  try {
    // Verify token with Supabase Auth
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data.user) {
      res.status(401).json({ error: "Token ไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่" });
      return;
    }

    // Look up app user profile by auth_id
    const result = await query<UserRow>(
      "SELECT id, username, role, email, auth_id FROM users WHERE auth_id = $1",
      [data.user.id]
    );

    if (!result.rows[0]) {
      res.status(401).json({ error: "ไม่พบข้อมูลผู้ใช้ กรุณาติดต่อผู้ดูแลระบบ" });
      return;
    }

    const appUser = result.rows[0];
    req.user = {
      id: appUser.id,
      username: appUser.username,
      role: appUser.role,
    };
    next();
  } catch {
    res.status(401).json({ error: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่" });
  }
}

/**
 * Middleware factory to require specific roles
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
