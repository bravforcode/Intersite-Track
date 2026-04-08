import { Request, Response, NextFunction } from "express";
import {
  clearLineLinkToken,
  createLineLinkToken,
  getLineLinkTokenByUserId,
} from "../database/queries/lineLink.queries.js";
import { findUserById, updateUser } from "../database/queries/user.queries.js";

export async function requestLineLinkCode(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: "กรุณาเข้าสู่ระบบก่อน" });
      return;
    }

    const user = await findUserById(req.user.id);
    if (!user) {
      res.status(404).json({ error: "ไม่พบข้อมูลผู้ใช้" });
      return;
    }

    const token = await createLineLinkToken(req.user.id);
    res.status(201).json({
      is_linked: Boolean(user.line_user_id),
      line_user_id: user.line_user_id ?? null,
      pending_code: token.code,
      expires_at: token.expires_at,
    });
  } catch (err) {
    next(err);
  }
}

export async function getLineLinkStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: "กรุณาเข้าสู่ระบบก่อน" });
      return;
    }

    const [user, token] = await Promise.all([
      findUserById(req.user.id),
      getLineLinkTokenByUserId(req.user.id),
    ]);

    if (!user) {
      res.status(404).json({ error: "ไม่พบข้อมูลผู้ใช้" });
      return;
    }

    res.json({
      is_linked: Boolean(user.line_user_id),
      line_user_id: user.line_user_id ?? null,
      pending_code: token?.code ?? null,
      expires_at: token?.expires_at ?? null,
    });
  } catch (err) {
    next(err);
  }
}

export async function unlinkMyLine(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: "กรุณาเข้าสู่ระบบก่อน" });
      return;
    }

    await Promise.all([
      updateUser(req.user.id, { line_user_id: null }),
      clearLineLinkToken(req.user.id),
    ]);

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}
