import { Request, Response, NextFunction } from "express";
import { adminAuth, db } from "../config/firebase-admin.js";
import axios from "axios";

async function verifyCurrentPassword(email: string, password: string): Promise<boolean> {
  const apiKey = process.env.VITE_FIREBASE_API_KEY;
  if (!apiKey) {
    throw new Error("Missing VITE_FIREBASE_API_KEY for password verification");
  }

  try {
    await axios.post(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
      {
        email,
        password,
        returnSecureToken: false,
      },
      { timeout: 5_000 }
    );
    return true;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 400) {
      return false;
    }
    throw error;
  }
}

function toSafeProfile(id: string, data: FirebaseFirestore.DocumentData) {
  return {
    id,
    username: data.username ?? "",
    email: data.email ?? null,
    first_name: data.first_name ?? "",
    last_name: data.last_name ?? "",
    role: data.role ?? "staff",
    department_id: data.department_id ?? null,
    department_name: null,
    position: data.position ?? "",
    line_user_id: data.line_user_id ?? null,
    created_at: data.created_at ?? undefined,
  };
}

async function usernameExists(username: string): Promise<boolean> {
  const snap = await db.collection("users").where("username", "==", username).limit(1).get();
  return !snap.empty;
}

async function buildUniqueUsername(email: string): Promise<string> {
  const emailPrefix = email.split("@")[0] ?? "user";
  const base =
    emailPrefix
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, "")
      .replace(/^[._-]+|[._-]+$/g, "") || "user";

  let candidate = base;
  let suffix = 1;
  while (await usernameExists(candidate)) {
    suffix += 1;
    candidate = `${base}${suffix}`;
  }
  return candidate;
}

/**
 * POST /api/auth/signup
 * Create Firebase Auth user + Firestore profile (staff role)
 */
export async function signup(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Validate input types first
    if (typeof req.body?.email !== "string" || typeof req.body?.password !== "string") {
      res.status(400).json({ error: "อีเมลและรหัสผ่านต้องเป็นข้อความ" });
      return;
    }
    
    const email = req.body.email.trim().toLowerCase();
    const password = req.body.password.trim();

    // Validate email format (RFC 5322 simplified)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      res.status(400).json({ error: "รูปแบบอีเมลไม่ถูกต้อง" });
      return;
    }
    
    if (!password) {
      res.status(400).json({ error: "กรุณากรอกรหัสผ่าน" });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({ error: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร" });
      return;
    }

    let authUid: string;
    try {
      const created = await adminAuth.createUser({ email, password, emailVerified: true });
      authUid = created.uid;
    } catch (err: any) {
      res.status(400).json({
        error:
          err.code === "auth/email-already-exists"
            ? "อีเมลนี้มีอยู่ในระบบแล้ว"
            : err.code === "auth/invalid-email"
              ? "รูปแบบอีเมลไม่ถูกต้อง"
              : "ยังไม่สามารถสร้างบัญชีได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง",
      });
      return;
    }

    try {
      const username = await buildUniqueUsername(email);
      await db.collection("users").doc(authUid).set({
        username,
        email,
        first_name: "",
        last_name: "",
        role: "staff",
        department_id: null,
        position: null,
        line_user_id: null,
        created_at: new Date().toISOString(),
      });

      res.status(201).json({ id: authUid, email });
    } catch (dbErr: unknown) {
      await adminAuth.deleteUser(authUid).catch(() => {});
      const msg = dbErr instanceof Error ? dbErr.message : "";
      res.status(500).json({
        error: "ยังไม่สามารถสร้างบัญชีได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง",
        ...(process.env.NODE_ENV === "development" && { detail: msg }),
      });
    }
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/profile
 * Return authenticated user profile (role, dept, etc.)
 */
export async function getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: "กรุณาเข้าสู่ระบบก่อน" });
      return;
    }

    const doc = await db.collection("users").doc(req.user.id).get();
    if (!doc.exists) {
      const msg = "ไม่พบข้อมูลผู้ใช้ในฐานข้อมูล";
      process.stderr.write(`[AUTH] Profile missing for uid=${req.user.id} email=${req.user.email}. Run: npx tsx scripts/setup-users.ts\n`);
      res.status(401).json({ 
        error: msg,
        ...(process.env.NODE_ENV === "development" && { 
          hint: "ให้รันคำสั่ง: npx tsx scripts/setup-users.ts" 
        }),
      });
      return;
    }

    res.json(toSafeProfile(doc.id, doc.data()!));
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/auth/me
 * Allow authenticated users to update their own profile.
 */
export async function updateMyProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const username = String(req.body?.username ?? "").trim();
    const first_name = String(req.body?.first_name ?? "").trim();
    const last_name = String(req.body?.last_name ?? "").trim();
    const position = typeof req.body?.position === "string" ? req.body.position.trim() : null;
    const line_user_id =
      req.body?.line_user_id === null
        ? null
        : typeof req.body?.line_user_id === "string"
          ? req.body.line_user_id.trim() || null
          : undefined;

    if (!username || !first_name || !last_name) {
      res.status(400).json({ error: "กรุณากรอกชื่อผู้ใช้ ชื่อ และนามสกุลให้ครบ" });
      return;
    }

    const existing = await db.collection("users").where("username", "==", username).limit(1).get();
    if (!existing.empty && existing.docs[0].id !== req.user!.id) {
      res.status(400).json({ error: "ชื่อผู้ใช้นี้มีอยู่แล้ว" });
      return;
    }

    const payload: Record<string, string | null> = { username, first_name, last_name, position };
    if (line_user_id !== undefined) payload.line_user_id = line_user_id;

    await db.collection("users").doc(req.user!.id).update(payload);

    const updated = await db.collection("users").doc(req.user!.id).get();
    res.json(toSafeProfile(updated.id, updated.data()!));
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/users/:id/password
 * Change password via Firebase Admin Auth
 */
export async function changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const targetUserId = req.params.id;
    const { current_password, new_password } = req.body;

    if (!req.user) {
      res.status(401).json({ error: "กรุณาเข้าสู่ระบบก่อน" });
      return;
    }

    if (req.user.role !== "admin" && req.user.id !== targetUserId) {
      res.status(403).json({ error: "คุณไม่มีสิทธิ์เปลี่ยนรหัสผ่านของผู้ใช้นี้" });
      return;
    }

    if (!new_password || new_password.length < 8) {
      res.status(400).json({ error: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร" });
      return;
    }

    const isSelfChange = req.user.id === targetUserId;
    if (isSelfChange) {
      if (typeof current_password !== "string" || current_password.length === 0) {
        res.status(400).json({ error: "กรุณากรอกรหัสผ่านปัจจุบัน" });
        return;
      }

      const email = req.user.email ?? (await adminAuth.getUser(targetUserId)).email ?? "";
      const verified = await verifyCurrentPassword(email, current_password);
      if (!verified) {
        res.status(400).json({ error: "รหัสผ่านปัจจุบันไม่ถูกต้อง" });
        return;
      }
    }

    await adminAuth.updateUser(targetUserId, { password: new_password });
    res.json({ success: true });
  } catch (err: any) {
    if (err.code === "auth/user-not-found") {
      res.status(404).json({ error: "ไม่พบผู้ใช้" });
      return;
    }
    next(err);
  }
}
