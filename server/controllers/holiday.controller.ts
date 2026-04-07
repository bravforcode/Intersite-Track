import { Request, Response, NextFunction } from "express";
import { findAllHolidays, createHoliday, updateHoliday, deleteHoliday } from "../database/queries/holiday.queries.js";

export async function getHolidays(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { year, month } = req.query as { year?: string; month?: string };
    const holidays = await findAllHolidays(year, month);
    res.json(holidays);
  } catch (err) { next(err); }
}

export async function createHolidayHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { date, name, type } = req.body;
    if (!date || !name || !type) {
      res.status(400).json({ error: "กรุณาระบุวันที่, ชื่อวันหยุด และประเภท" });
      return;
    }
    const id = await createHoliday({ date, name, type, created_by: req.user!.id });
    res.json({ id });
  } catch (err) { next(err); }
}

export async function updateHolidayHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { date, name, type } = req.body;
    await updateHoliday(req.params.id, { date, name, type });
    res.json({ success: true });
  } catch (err) { next(err); }
}

export async function deleteHolidayHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await deleteHoliday(req.params.id);
    res.json({ success: true });
  } catch (err) { next(err); }
}

export async function getLineGroupIdHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { getLineGroupId } = await import("../database/queries/appSettings.queries.js");
    const groupId = await getLineGroupId();
    res.json({ group_id: groupId });
  } catch (err) { next(err); }
}
