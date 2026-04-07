import { Request, Response, NextFunction } from "express";
import { adminAuth, db } from "../config/firebase-admin.js";

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
 * Verify Firebase ID Token and attach the mapped application user to req.user.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  let token: string | undefined;
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7);
  } else if (req.query.token && typeof req.query.token === "string") {
    token = req.query.token;
  }

  if (!token) {
    res.status(401).json({ error: "กรุณาเข้าสู่ระบบก่อน" });
    return;
  }

  const cached = authCache.get(token);

  if (cached && cached.expiresAt > Date.now()) {
    req.user = cached.user;
    next();
    return;
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    const uid = decodedToken.uid;

    const userDoc = await db.collection("users").doc(uid).get();

    if (!userDoc.exists) {
      res.status(401).json({ error: "ไม่พบข้อมูลผู้ใช้ กรุณาติดต่อแอดมิน" });
      return;
    }

    const appUser = userDoc.data()!;

    req.user = {
      id: uid,
      userId: uid,
      authId: uid,
      email: appUser.email ?? null,
      username: appUser.username ?? "",
      role: appUser.role ?? "staff",
      first_name: appUser.first_name ?? "",
      last_name: appUser.last_name ?? "",
      department_id: appUser.department_id ?? null,
      department_name: null,
      position: appUser.position ?? null,
      created_at: appUser.created_at ?? undefined,
    };

    authCache.set(token, {
      expiresAt: Date.now() + AUTH_CACHE_TTL_MS,
      user: req.user,
    });

    next();
  } catch {
    res.status(401).json({ error: "Token ไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่" });
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
