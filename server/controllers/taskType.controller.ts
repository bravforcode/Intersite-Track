import { Request, Response, NextFunction } from "express";
import { query } from "../database/connection";

export async function getTaskTypes(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await query("SELECT * FROM task_types ORDER BY id");
    res.json(result.rows);
  } catch (err) { next(err); }
}

export async function createTaskType(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name } = req.body;
    if (!name) { res.status(400).json({ error: "กรุณาระบุชื่อประเภทงาน" }); return; }
    const result = await query("INSERT INTO task_types (name) VALUES ($1) RETURNING id", [name]);
    res.json({ id: result.rows[0].id });
  } catch (err) {
    res.status(400).json({ error: "ประเภทงานนี้มีอยู่แล้ว" });
  }
}

export async function updateTaskType(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await query("UPDATE task_types SET name=$1 WHERE id=$2", [req.body.name, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: "ประเภทงานนี้มีอยู่แล้ว" });
  }
}

export async function deleteTaskType(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await query("DELETE FROM task_types WHERE id=$1", [req.params.id]);
    res.json({ success: true });
  } catch (err: unknown) {
    next(err);
  }
}
