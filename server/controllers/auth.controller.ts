import { Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "../config/supabase.js";

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
          detail: msg || "create profile failed",
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
    const { data: profile, error } = await supabaseAdmin
      .from("users")
      .select("id, username, email, auth_id, first_name, last_name, role, department_id, position, created_at")
      .eq("id", req.user!.id)
      .single();

    if (error || !profile) {
      res.status(404).json({ error: "ไม่พบข้อมูลผู้ใช้" });
      return;
    }

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

    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("auth_id")
      .eq("id", Number(req.params.id))
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
