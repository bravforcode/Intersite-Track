import { Request, Response, NextFunction } from "express";
import {
  findAllUsers, findUserById, createUser, updateUser, deleteUser, getUserTasks,
} from "../database/queries/user.queries.js";
import { adminAuth } from "../config/firebase-admin.js";

/** GET /api/users */
export async function getUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const users = await findAllUsers();
    res.json(users.map(({ password: _pw, ...u }) => u));
  } catch (err) { next(err); }
}

/** GET /api/users/:id */
export async function getUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await findUserById(req.params.id);
    if (!user) { res.status(404).json({ error: "ไม่พบผู้ใช้" }); return; }
    const { password: _pw, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (err) { next(err); }
}

/** POST /api/users — create Supabase Auth user + app profile */
export async function createUserHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password, first_name, last_name, username, role, department_id, position } = req.body;

    if (!email || !password || !first_name || !last_name || !username) {
      res.status(400).json({ error: "กรุณากรอกข้อมูลให้ครบ (email, password, ชื่อ-นามสกุล, username)" });
      return;
    }
    if (password.length < 8) {
      res.status(400).json({ error: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร" });
      return;
    }

    // Create Firebase Auth user
    let authUid: string;
    try {
      const authUser = await adminAuth.createUser({
        email,
        password,
      });
      authUid = authUser.uid;
    } catch (err: any) {
      const errorMessage = err?.message || "ไม่สามารถสร้างบัญชีผู้ใช้ได้";
      res.status(400).json({
        error: errorMessage.includes("already exists")
          ? "อีเมลนี้มีอยู่ในระบบแล้ว"
          : errorMessage,
      });
      return;
    }

    // Create app profile, rollback Auth user if DB fails
    try {
      const id = await createUser({ username, email, auth_id: authUid, first_name, last_name, role, department_id, position });
      res.json({ id });
    } catch (dbErr: unknown) {
      await adminAuth.deleteUser(authUid).catch(() => {});
      const msg = dbErr instanceof Error ? dbErr.message : "";
      if (msg.includes("unique") || msg.includes("duplicate")) {
        res.status(400).json({ error: "ชื่อผู้ใช้หรืออีเมลนี้มีอยู่แล้ว" });
      } else {
        next(dbErr);
      }
    }
  } catch (err) { next(err); }
}

/** PUT /api/users/:id */
export async function updateUserHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { username, first_name, last_name, role, department_id, position } = req.body;
    await updateUser(req.params.id, { username, first_name, last_name, role, department_id, position });
    res.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("unique") || msg.includes("duplicate")) {
      res.status(400).json({ error: "ชื่อผู้ใช้นี้มีอยู่แล้ว" });
    } else { next(err); }
  }
}

/** DELETE /api/users/:id — delete profile + Firebase Auth user */
export async function deleteUserHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await findUserById(req.params.id);
    if (!user) { res.status(404).json({ error: "ไม่พบผู้ใช้" }); return; }

    await deleteUser(req.params.id);

    if (user.auth_id) {
      await adminAuth.deleteUser(user.auth_id).catch(() => {});
    }

    res.json({ success: true });
  } catch (err) { next(err); }
}

/** GET /api/users/:id/tasks */
export async function getUserTasksHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const requestedUserId = req.params.id;

    if (!req.user) {
      res.status(401).json({ error: "กรุณาเข้าสู่ระบบก่อน" });
      return;
    }

    if (req.user.role !== "admin" && req.user.id !== requestedUserId) {
      res.status(403).json({ error: "คุณไม่มีสิทธิ์เข้าถึงข้อมูลงานของผู้ใช้นี้" });
      return;
    }

    const tasks = await getUserTasks(requestedUserId);
    res.json(tasks);
  } catch (err) { next(err); }
}
