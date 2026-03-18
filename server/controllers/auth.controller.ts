import { Request, Response, NextFunction } from "express";
import { findUserById, createUser, findUserByUsername } from "../database/queries/user.queries";
import { supabaseAdmin } from "../config/supabase";

async function buildUniqueUsername(email: string): Promise<string> {
  const emailPrefix = email.split("@")[0] ?? "user";
  const normalizedBase = emailPrefix
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "")
    .replace(/^[._-]+|[._-]+$/g, "");

  const base = normalizedBase || "user";
  let candidate = base;
  let suffix = 1;

  while (await findUserByUsername(candidate)) {
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
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "กรุณากรอกอีเมลและรหัสผ่าน" });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({ error: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร" });
      return;
    }

    // Create Supabase Auth user (email_confirm: false, will send verification)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Skip email verification for internal system
    });

    if (authError) {
      res.status(400).json({
        error: authError.message.includes("already registered")
          ? "อีเมลนี้มีอยู่ในระบบแล้ว"
          : authError.message,
      });
      return;
    }

    const authId = authData.user.id;

    // Create basic app profile with staff role, rollback Auth user if DB fails
    try {
      const username = await buildUniqueUsername(email);
      const id = await createUser({
        username,
        email,
        auth_id: authId,
        first_name: "",
        last_name: "",
        role: "staff", // Default role
        department_id: null,
        position: null,
      });
      res.status(201).json({ id, email });
    } catch (dbErr: unknown) {
      await supabaseAdmin.auth.admin.deleteUser(authId).catch(() => {});
      const msg = dbErr instanceof Error ? dbErr.message : "";
      if (msg.includes("unique") || msg.includes("duplicate")) {
        res.status(400).json({ error: "อีเมลนี้มีอยู่ในระบบแล้ว" });
      } else {
        next(dbErr);
      }
    }
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/profile
 * Called by frontend after Supabase sign-in to get the app user profile (role, dept, etc.)
 * The middleware has already verified the token and set req.user.id
 */
export async function getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await findUserById(req.user!.id);
    if (!user) {
      res.status(404).json({ error: "ไม่พบข้อมูลผู้ใช้" });
      return;
    }
    const { password: _pw, ...profile } = user;
    res.json(profile);
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/users/:id/password
 * Change password via Supabase Auth admin API
 */
export async function changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { new_password } = req.body;

    if (!new_password || new_password.length < 8) {
      res.status(400).json({ error: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร" });
      return;
    }

    const user = await findUserById(Number(req.params.id));
    if (!user) {
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
