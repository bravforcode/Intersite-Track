import { Request, Response, NextFunction } from "express";
import { query } from "../database/connection.js";

export async function getDepartments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await query("SELECT * FROM departments ORDER BY id");
    res.json(result.rows);
  } catch (err) { next(err); }
}

export async function createDepartment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name } = req.body;
    if (!name) { res.status(400).json({ error: "กรุณาระบุชื่อหน่วยงาน" }); return; }
    const result = await query("INSERT INTO departments (name) VALUES ($1) RETURNING id", [name]);
    res.json({ id: result.rows[0].id });
  } catch (err) {
    res.status(400).json({ error: "ชื่อหน่วยงานนี้มีอยู่แล้ว" });
  }
}

export async function updateDepartment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await query("UPDATE departments SET name=$1 WHERE id=$2", [req.body.name, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: "ชื่อหน่วยงานนี้มีอยู่แล้ว" });
  }
}

export async function deleteDepartment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await query("DELETE FROM departments WHERE id=$1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: "ไม่สามารถลบได้ มีผู้ใช้ในหน่วยงานนี้" });
  }
}
