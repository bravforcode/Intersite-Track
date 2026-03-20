import { Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "../config/supabase.js";

export async function getTaskTypes(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { data, error } = await supabaseAdmin
      .from("task_types")
      .select("*")
      .order("id", { ascending: true });

    if (error) throw error;
    res.json(data ?? []);
  } catch (err) { next(err); }
}

export async function createTaskType(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name } = req.body;
    if (!name) { res.status(400).json({ error: "กรุณาระบุชื่อประเภทงาน" }); return; }

    const { data, error } = await supabaseAdmin
      .from("task_types")
      .insert({ name })
      .select("id")
      .single();

    if (error || !data) throw error ?? new Error("Failed to create task type");
    res.json({ id: data.id });
  } catch (err) {
    res.status(400).json({ error: "ประเภทงานนี้มีอยู่แล้ว" });
  }
}

export async function updateTaskType(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { error } = await supabaseAdmin
      .from("task_types")
      .update({ name: req.body.name })
      .eq("id", Number(req.params.id));

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: "ประเภทงานนี้มีอยู่แล้ว" });
  }
}

export async function deleteTaskType(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { error } = await supabaseAdmin
      .from("task_types")
      .delete()
      .eq("id", Number(req.params.id));

    if (error) throw error;
    res.json({ success: true });
  } catch (err: unknown) {
    next(err);
  }
}
