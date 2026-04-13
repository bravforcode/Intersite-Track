import { Request, Response, NextFunction } from "express";
import { db } from "../config/firebase-admin.js";

export async function getDepartments(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const snap = await db.collection("departments").orderBy("name", "asc").get();
    res.json(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  } catch (err) { next(err); }
}

export async function createDepartment(req: Request, res: Response, _next: NextFunction): Promise<void> {
  try {
    const { name } = req.body;
    if (!name) { res.status(400).json({ error: "กรุณาระบุชื่อหน่วยงาน" }); return; }

    const existing = await db.collection("departments").where("name", "==", name).limit(1).get();
    if (!existing.empty) { res.status(400).json({ error: "ชื่อหน่วยงานนี้มีอยู่แล้ว" }); return; }

    const ref = db.collection("departments").doc();
    await ref.set({ name, created_at: new Date().toISOString() });
    res.json({ id: ref.id });
  } catch (err) {
    res.status(400).json({ error: "ชื่อหน่วยงานนี้มีอยู่แล้ว" });
  }
}

export async function updateDepartment(req: Request, res: Response, _next: NextFunction): Promise<void> {
  try {
    await db.collection("departments").doc(req.params.id).update({ name: req.body.name });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: "ชื่อหน่วยงานนี้มีอยู่แล้ว" });
  }
}

export async function deleteDepartment(req: Request, res: Response, _next: NextFunction): Promise<void> {
  try {
    await db.collection("departments").doc(req.params.id).delete();
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: "ไม่สามารถลบได้ มีผู้ใช้ในหน่วยงานนี้" });
  }
}
