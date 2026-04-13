/// <reference path="../types/express.d.ts" />
import { Request, Response, NextFunction } from "express";
import { adminAuth, db } from "../config/firebase-admin.js";

/** Cache TTL: 15s for sensitive ops, 30s general */
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
}, 2 * 60_000).unref();

/**
 * Verify Firebase ID Token and attach the mapped application user to req.user.
 *
 * SECURITY: Token MUST be sent in the Authorization header as "Bearer <token>".
 * Query-string tokens (?token=...) are NOT supported — they leak credentials
 * into server logs, browser history, and Referer headers.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  let token: string | undefined;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7);
  }

  if (!token) {
    res.status(401).json({ error: "กรุณาเข้าสู่ระบบก่อน" });
    return;
  }

  // Fast path: serve from cache
  const cached = authCache.get(token);
  if (cached && cached.expiresAt > Date.now()) {
    req.user = cached.user;
    next();
    return;
  }

  try {
    // checkRevoked: true detects tokens that have been revoked via Firebase Admin
    let decodedToken: FirebaseFirestore.DocumentData;
    try {
      decodedToken = await adminAuth.verifyIdToken(token, /* checkRevoked= */ true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const isRevoked = message.includes("revoked");
      process.stderr.write(`[AUTH] verifyIdToken FAILED: ${message}\n`);
      res.status(401).json({
        error: isRevoked
          ? "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่"
          : "Token ไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่",
      });
      return;
    }

    const uid = decodedToken.uid as string;

    let userDoc: FirebaseFirestore.DocumentSnapshot;
    try {
      userDoc = await db.collection("users").doc(uid).get();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      process.stderr.write(`[AUTH] Firestore get FAILED for uid=${uid}: ${errMsg}\n`);
      res.status(500).json({ 
        error: "เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้",
        ...(process.env.NODE_ENV === "development" && { detail: errMsg }),
      });
      return;
    }

    if (!userDoc.exists) {
      process.stderr.write(`[AUTH] User doc not found: uid=${uid}\n`);
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
  } catch (err: unknown) {
    process.stderr.write(`[AUTH] unexpected error: ${err instanceof Error ? err.message : err}\n`);
    res.status(500).json({ error: "เกิดข้อผิดพลาด กรุณาลองใหม่" });
  }
}

export const verifyJWT = requireAuth;

/**
 * Middleware factory to require one or more roles.
 * Must be used AFTER requireAuth.
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

/**
 * Invalidate the auth cache for a specific token.
 * Call this when a user's role changes or they are disabled.
 */
export function invalidateAuthCache(token: string): void {
  authCache.delete(token);
}
