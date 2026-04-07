import { Request, Response, NextFunction } from "express";
import { adminAuth, db } from "../config/firebase-admin.js";

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
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    const password = String(req.body?.password ?? "");

    if (!email || !password) {
      res.status(400).json({ error: "กรุณากรอกอีเมลและรหัสผ่าน" });
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
      res.status(401).json({ error: "ไม่พบข้อมูลผู้ใช้" });
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

    if (!username || !first_name || !last_name) {
      res.status(400).json({ error: "กรุณากรอกชื่อผู้ใช้ ชื่อ และนามสกุลให้ครบ" });
      return;
    }

    const existing = await db.collection("users").where("username", "==", username).limit(1).get();
    if (!existing.empty && existing.docs[0].id !== req.user!.id) {
      res.status(400).json({ error: "ชื่อผู้ใช้นี้มีอยู่แล้ว" });
      return;
    }

    await db.collection("users").doc(req.user!.id).update({ username, first_name, last_name, position });

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
    const { new_password } = req.body;

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
