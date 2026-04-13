import { Request, Response, NextFunction } from "express";
import {
  findAllSaturdaySchedules, createSaturdaySchedule,
  updateSaturdaySchedule, deleteSaturdaySchedule, addUserToSaturdaySchedule,
} from "../database/queries/saturdaySchedule.queries.js";
import { findAllUsers } from "../database/queries/user.queries.js";

export async function getSaturdaySchedules(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { year, month } = req.query as { year?: string; month?: string };
    const schedules = await findAllSaturdaySchedules(year, month);
    const users = await findAllUsers();
    const userMap = new Map(users.map(u => [u.id, `${u.first_name} ${u.last_name}`]));
    const enriched = schedules.map(s => ({
      ...s,
      user_names: s.user_ids.map(uid => userMap.get(uid) ?? uid),
    }));
    res.json(enriched);
  } catch (err) { next(err); }
}

export async function createSaturdayScheduleHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { date, user_ids, note } = req.body;
    if (!date || !Array.isArray(user_ids)) {
      res.status(400).json({ error: "กรุณาระบุวันที่และรายชื่อผู้มีเวร" });
      return;
    }
    const id = await createSaturdaySchedule({ date, user_ids, note: note ?? null, created_by: req.user!.id });
    res.json({ id });
  } catch (err) { next(err); }
}

export async function updateSaturdayScheduleHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { date, user_ids, note } = req.body;
    await updateSaturdaySchedule(req.params.id, { date, user_ids, note });
    res.json({ success: true });
  } catch (err) { next(err); }
}

export async function deleteSaturdayScheduleHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await deleteSaturdaySchedule(req.params.id);
    res.json({ success: true });
  } catch (err) { next(err); }
}

export async function joinSaturdayScheduleHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await addUserToSaturdaySchedule(req.params.id, req.user!.id);
    res.json({ success: true });
  } catch (err) { next(err); }
}

export async function importSaturdayScheduleHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { schedules } = req.body as { schedules: Array<{ date: string; user_ids: string[] }> };
    if (!Array.isArray(schedules)) {
      res.status(400).json({ error: "รูปแบบข้อมูลไม่ถูกต้อง" });
      return;
    }
    const results: string[] = [];
    for (const s of schedules) {
      const id = await createSaturdaySchedule({ date: s.date, user_ids: s.user_ids, note: null, created_by: req.user!.id });
      results.push(id);
    }
    res.json({ imported: results.length, ids: results });
  } catch (err) { next(err); }
}
