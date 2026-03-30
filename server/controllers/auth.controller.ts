import { Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "../config/supabase.js";

interface AuthProfileRow {
  id: number;
  username: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  role: "admin" | "staff";
  department_id: number | null;
  position: string | null;
  created_at: string | null;
}

function toSafeProfile(profile: AuthProfileRow) {
  return {
    id: profile.id,
    username: profile.username,
    email: profile.email,
    first_name: profile.first_name ?? "",
    last_name: profile.last_name ?? "",
    role: profile.role,
    department_id: profile.department_id,
    department_name: null,
    position: profile.position ?? "",
    created_at: profile.created_at ?? undefined,
  };
}

async function usernameExists(username: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return Boolean(data);
}

async function buildUniqueUsername(email: string): Promise<string> {
  const emailPrefix = email.split("@")[0] ?? "user";
  const normalizedBase = emailPrefix
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "")
    .replace(/^[._-]+|[._-]+$/g, "");

  const base = normalizedBase || "user";
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
 * Public endpoint: create Supabase Auth user + basic app profile (staff role)
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

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      res.status(400).json({
        error:
          authError.message.includes("already registered")
            ? "อีเมลนี้มีอยู่ในระบบแล้ว"
            : authError.message.includes("email")
              ? "รูปแบบอีเมลไม่ถูกต้อง"
              : "ยังไม่สามารถสร้างบัญชีได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง",
      });
      return;
    }

    const authId = authData.user.id;

    try {
      const username = await buildUniqueUsername(email);
      const { data: insertedUser, error: insertError } = await supabaseAdmin
        .from("users")
        .insert({
          username,
          email,
          auth_id: authId,
          first_name: "",
          last_name: "",
          role: "staff",
          department_id: null,
          position: null,
        })
        .select("id, email")
        .single();

      if (insertError || !insertedUser) {
        throw insertError ?? new Error("create profile failed");
      }

      res.status(201).json(insertedUser);
    } catch (dbErr: unknown) {
      await supabaseAdmin.auth.admin.deleteUser(authId).catch(() => {});
      const msg = dbErr instanceof Error ? dbErr.message : "";
      if (msg.includes("duplicate") || msg.includes("unique")) {
        res.status(400).json({ error: "อีเมลนี้มีอยู่ในระบบแล้ว" });
      } else {
        res.status(500).json({
          error: "ยังไม่สามารถสร้างบัญชีได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง",
          ...(process.env.NODE_ENV === "development" && { detail: msg || "create profile failed" }),
        });
      }
    }
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/profile
 * Called by frontend after Supabase sign-in to get the app user profile (role, dept, etc.)
 */
export async function getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: "กรุณาเข้าสู่ระบบก่อน" });
      return;
    }

    res.json({
      id: req.user.id,
      username: req.user.username,
      email: req.user.email,
      first_name: req.user.first_name ?? "",
      last_name: req.user.last_name ?? "",
      role: req.user.role,
      department_id: req.user.department_id ?? null,
      department_name: req.user.department_name ?? null,
      position: req.user.position ?? "",
      created_at: req.user.created_at,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/auth/me
 * Allow authenticated users to update their own profile safely.
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

    const { data: updatedProfile, error } = await supabaseAdmin
      .from("users")
      .update({
        username,
        first_name,
        last_name,
        position,
      })
      .eq("id", req.user!.id)
      .select("id, username, email, first_name, last_name, role, department_id, position, created_at")
      .single<AuthProfileRow>();

    if (error || !updatedProfile) {
      res.status(404).json({ error: "ไม่พบข้อมูลผู้ใช้" });
      return;
    }

    res.json(toSafeProfile(updatedProfile));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("unique") || msg.includes("duplicate")) {
      res.status(400).json({ error: "ชื่อผู้ใช้นี้มีอยู่แล้ว" });
      return;
    }

    next(err);
  }
}

/**
 * PUT /api/users/:id/password
 * Change password via Supabase Auth admin API
 */
export async function changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const targetUserId = Number(req.params.id);
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

    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("auth_id")
      .eq("id", targetUserId)
      .single();

    if (userError || !user) {
      res.status(404).json({ error: "ไม่พบผู้ใช้" });
      return;
    }

    if (!user.auth_id) {
      res.status(400).json({ error: "ผู้ใช้นี้ยังไม่ได้เชื่อมต่อกับระบบยืนยันตัวตน" });
      return;
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(user.auth_id, {
      password: new_password,
    });

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}
