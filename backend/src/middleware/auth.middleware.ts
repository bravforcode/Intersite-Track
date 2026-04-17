/// <reference path="../types/express.d.ts" />
import { Request, Response, NextFunction } from "express";
import { adminAuth, db } from "../config/firebase-admin.js";

type CachedUser = {
  id: string;
  userId: string;
  authId: string;
  email: string | null;
  username: string;
  role: string;
  first_name: string;
  last_name: string;
  department_id: string | null;
  department_name: string | null;
  position: string | null;
  created_at?: string;
};

const userCache = new Map<string, { user: CachedUser; expiresAt: number }>();

function extractBearerToken(req: Request): string | undefined {
  const authHeader = req.headers.authorization;
  return authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : undefined;
}

function isCronSecretRequest(req: Request, token: string): boolean {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret || token !== cronSecret) {
    return false;
  }

  return req.path.startsWith("/cron/") || req.originalUrl.startsWith("/api/cron/");
}

type AuthResolution =
  | { ok: true; user: CachedUser }
  | { ok: false; status: number; error: string; detail?: string };

async function resolveUserFromToken(token: string): Promise<AuthResolution> {
  let decodedToken: FirebaseFirestore.DocumentData;
  try {
    decodedToken = await adminAuth.verifyIdToken(token, /* checkRevoked= */ true);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const isRevoked = message.includes("revoked");
    process.stderr.write(`[AUTH] verifyIdToken FAILED: ${message}\n`);
    return {
      ok: false,
      status: 401,
      error: isRevoked
        ? "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่"
        : "Token ไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่",
    };
  }

  const uid = decodedToken.uid as string;
  const cacheTtlMs = Number(process.env.AUTH_USER_CACHE_TTL_MS ?? "30000");

  if (Number.isFinite(cacheTtlMs) && cacheTtlMs > 0) {
    const cached = userCache.get(uid);
    if (cached && Date.now() < cached.expiresAt) {
      return { ok: true, user: cached.user };
    }
  }

  let userDoc: FirebaseFirestore.DocumentSnapshot;
  try {
    userDoc = await db.collection("users").doc(uid).get();
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`[AUTH] Firestore get FAILED for uid=${uid}: ${errMsg}\n`);
    const allowStale =
      process.env.NODE_ENV !== "production" &&
      (process.env.AUTH_ALLOW_STALE_ON_ERROR ?? "1") === "1";

    const cached = userCache.get(uid);
    if (allowStale && cached) {
      return { ok: true, user: cached.user };
    }

    return {
      ok: false,
      status: 500,
      error: "เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้",
      ...(process.env.NODE_ENV === "development" ? { detail: errMsg } : {}),
    };
  }

  if (!userDoc.exists) {
    process.stderr.write(`[AUTH] User doc not found: uid=${uid}\n`);
    return { ok: false, status: 401, error: "ไม่พบข้อมูลผู้ใช้ กรุณาติดต่อแอดมิน" };
  }

  const appUser = userDoc.data()!;
  const mappedUser: CachedUser = {
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
    ...(typeof appUser.created_at === "string" ? { created_at: appUser.created_at } : {}),
  };

  if (Number.isFinite(cacheTtlMs) && cacheTtlMs > 0) {
    // SECURITY/PERFORMANCE: Bound the cache to prevent memory pressure on serverless instances
    if (userCache.size >= 500) {
      // Evict the first (oldest) entry to maintain size
      const firstKey = userCache.keys().next().value;
      if (firstKey !== undefined) userCache.delete(firstKey);
    }
    userCache.set(uid, { user: mappedUser, expiresAt: Date.now() + cacheTtlMs });
  }

  return { ok: true, user: mappedUser };
}

function sendAuthError(res: Response, result: Extract<AuthResolution, { ok: false }>): void {
  res.status(result.status).json({
    error: result.error,
    ...(result.detail ? { detail: result.detail } : {}),
  });
}

/**
 * Verify Firebase ID Token and attach the mapped application user to req.user.
 *
 * SECURITY: Token MUST be sent in the Authorization header as "Bearer <token>".
 * Query-string tokens (?token=...) are NOT supported — they leak credentials
 * into server logs, browser history, and Referer headers.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (req.user) {
    next();
    return;
  }

  const token = extractBearerToken(req);
  if (!token) {
    res.status(401).json({ error: "กรุณาเข้าสู่ระบบก่อน" });
    return;
  }

  try {
    const result = await resolveUserFromToken(token);
    if (!result.ok) {
      sendAuthError(res, result);
      return;
    }

    req.user = result.user;
    next();
  } catch (err: unknown) {
    process.stderr.write(`[AUTH] unexpected error: ${err instanceof Error ? err.message : err}\n`);
    res.status(500).json({ error: "เกิดข้อผิดพลาด กรุณาลองใหม่" });
  }
}

export const verifyJWT = requireAuth;

/**
 * Attach req.user when a Bearer token is present, but allow public routes to
 * proceed without a token. Invalid provided tokens still fail closed.
 */
export async function optionalAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (req.user) {
    next();
    return;
  }

  const token = extractBearerToken(req);
  if (!token) {
    next();
    return;
  }

  if (isCronSecretRequest(req, token)) {
    next();
    return;
  }

  try {
    const result = await resolveUserFromToken(token);
    if (!result.ok) {
      sendAuthError(res, result);
      return;
    }
    req.user = result.user;
    next();
  } catch (err: unknown) {
    process.stderr.write(`[AUTH] optional auth unexpected error: ${err instanceof Error ? err.message : err}\n`);
    res.status(500).json({ error: "เกิดข้อผิดพลาด กรุณาลองใหม่" });
  }
}

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
