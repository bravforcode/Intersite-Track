import { Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "../config/supabase.js";

export async function getDepartments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { data, error } = await supabaseAdmin
      .from("departments")
      .select("*")
      .order("id", { ascending: true });

    if (error) throw error;
    res.json(data ?? []);
  } catch (err) { next(err); }
}

export async function createDepartment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name } = req.body;
    if (!name) { res.status(400).json({ error: "กรุณาระบุชื่อหน่วยงาน" }); return; }

    const { data, error } = await supabaseAdmin
      .from("departments")
      .insert({ name })
      .select("id")
      .single();

    if (error || !data) throw error ?? new Error("Failed to create department");
    res.json({ id: data.id });
  } catch (err) {
    res.status(400).json({ error: "ชื่อหน่วยงานนี้มีอยู่แล้ว" });
  }
}

export async function updateDepartment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { error } = await supabaseAdmin
      .from("departments")
      .update({ name: req.body.name })
      .eq("id", Number(req.params.id));

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: "ชื่อหน่วยงานนี้มีอยู่แล้ว" });
  }
}

export async function deleteDepartment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { error } = await supabaseAdmin
      .from("departments")
      .delete()
      .eq("id", Number(req.params.id));

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: "ไม่สามารถลบได้ มีผู้ใช้ในหน่วยงานนี้" });
  }
}
