import { Request, Response, NextFunction } from "express";
import { db } from "../config/firebase-admin.js";

export async function getTaskTypes(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const snap = await db.collection("task_types").orderBy("name", "asc").get();
    res.json(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  } catch (err) { next(err); }
}

export async function createTaskType(req: Request, res: Response, _next: NextFunction): Promise<void> {
  try {
    const { name } = req.body;
    if (!name) { res.status(400).json({ error: "กรุณาระบุชื่อประเภทงาน" }); return; }

    const existing = await db.collection("task_types").where("name", "==", name).limit(1).get();
    if (!existing.empty) { res.status(400).json({ error: "ประเภทงานนี้มีอยู่แล้ว" }); return; }

    const ref = db.collection("task_types").doc();
    await ref.set({ name, created_at: new Date().toISOString() });
    res.json({ id: ref.id });
  } catch (err) {
    res.status(400).json({ error: "ประเภทงานนี้มีอยู่แล้ว" });
  }
}

export async function updateTaskType(req: Request, res: Response, _next: NextFunction): Promise<void> {
  try {
    await db.collection("task_types").doc(req.params.id).update({ name: req.body.name });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: "ประเภทงานนี้มีอยู่แล้ว" });
  }
}

export async function deleteTaskType(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await db.collection("task_types").doc(req.params.id).delete();
    res.json({ success: true });
  } catch (err: unknown) {
    next(err);
  }
}
