import { Request, Response, NextFunction } from "express";
import { findUserById } from "../database/queries/user.queries";
import { supabaseAdmin } from "../config/supabase";

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
