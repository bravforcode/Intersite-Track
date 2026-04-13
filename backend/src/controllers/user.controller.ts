import { Request, Response, NextFunction } from "express";
import {
  findAllUsers, findUserById, createUser, updateUser,
  getUserTasks, getTaskContextUsers,
} from "../database/queries/user.queries.js";
import { adminAuth, db } from "../config/firebase-admin.js";
import { createAuditLog } from "../utils/auditLogger.js";

/** GET /api/users — Admin only (enforced at route level) */
export async function getUsers(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const users = await findAllUsers();
    // Never expose raw password field (Firestore shouldn't have it, but guard defensively)
    res.json(users.map(({ password: _pw, ...u }) => u));
  } catch (err) { next(err); }
}

/**
 * GET /api/users/:id
 * Admin: can view any user.
 * Staff: can only view their own profile.
 */
export async function getUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const requestedId = req.params.id;
    const isAdmin = req.user?.role === "admin";
    const isSelf = req.user?.id === requestedId;

    if (!isAdmin && !isSelf) {
      res.status(403).json({ error: "คุณไม่มีสิทธิ์เข้าถึงข้อมูลผู้ใช้นี้" });
      return;
    }

    const user = await findUserById(requestedId);
    if (!user) {
      res.status(404).json({ error: "ไม่พบผู้ใช้" });
      return;
    }

    const { password: _pw, ...safeUser } = user;
    res.json(safeUser);
  } catch (err) { next(err); }
}

/** POST /api/users — Admin only (enforced at route level) */
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

    // Create Firebase Auth user first
    let authUid: string;
    try {
      const authUser = await adminAuth.createUser({ email, password });
      authUid = authUser.uid;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "ไม่สามารถสร้างบัญชีผู้ใช้ได้";
      res.status(400).json({
        error: message.includes("already exists") ? "อีเมลนี้มีอยู่ในระบบแล้ว" : message,
      });
      return;
    }

    // Create app profile in Firestore; rollback Firebase Auth user if it fails
    try {
      const id = await createUser({
        username, email, auth_id: authUid, first_name, last_name,
        role: role ?? "staff", department_id: department_id ?? null,
        position: position ?? null,
      });

      await createAuditLog(id, req.user?.id ?? null, "USER_CREATE", null, {
        email, first_name, last_name, role: role ?? "staff",
      });

      res.json({ id });
    } catch (dbErr: unknown) {
      // Rollback: delete the Firebase Auth user if Firestore write failed
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

/** PUT /api/users/:id — Admin only (enforced at route level) */
export async function updateUserHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { username, first_name, last_name, role, department_id, position } = req.body;

    const existing = await findUserById(req.params.id);
    if (!existing) {
      res.status(404).json({ error: "ไม่พบผู้ใช้" });
      return;
    }

    await updateUser(req.params.id, { username, first_name, last_name, role, department_id, position });

    await createAuditLog(req.params.id, req.user?.id ?? null, "USER_UPDATE", existing, {
      username, first_name, last_name, role, department_id, position,
    });

    res.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("unique") || msg.includes("duplicate")) {
      res.status(400).json({ error: "ชื่อผู้ใช้นี้มีอยู่แล้ว" });
    } else {
      next(err);
    }
  }
}

/**
 * DELETE /api/users/:id — Admin only (enforced at route level)
 *
 * Performs a cascade cleanup:
 * 1. Remove user from task assignments (update assignees array)
 * 2. Delete notifications for this user
 * 3. Delete Firestore user document
 * 4. Delete Firebase Auth account
 */
export async function deleteUserHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const targetId = req.params.id;

    // Prevent self-deletion
    if (req.user?.id === targetId) {
      res.status(400).json({ error: "ไม่สามารถลบบัญชีของตัวเองได้" });
      return;
    }

    const user = await findUserById(targetId);
    if (!user) {
      res.status(404).json({ error: "ไม่พบผู้ใช้" });
      return;
    }

    const batch = db.batch();

    // 1. Delete notifications for this user
    const notifSnap = await db.collection("notifications").where("user_id", "==", targetId).get();
    notifSnap.docs.forEach((doc) => batch.delete(doc.ref));

    // 2. Delete the user Firestore document
    batch.delete(db.collection("users").doc(targetId));

    await batch.commit();

    // 3. Remove user from task assignments (done separately — could be many tasks)
    const taskSnap = await db.collection("tasks")
      .where("assignees", "array-contains", targetId)
      .get();

    const taskBatch = db.batch();
    for (const taskDoc of taskSnap.docs) {
      const data = taskDoc.data();
      const newAssignees: string[] = (data.assignees ?? []).filter((id: string) => id !== targetId);
      const newDetails = (data.assignee_details ?? []).filter((a: { id: string }) => a.id !== targetId);
      taskBatch.update(taskDoc.ref, {
        assignees: newAssignees,
        assignee_details: newDetails,
        updated_at: new Date().toISOString(),
      });
    }
    if (taskSnap.size > 0) await taskBatch.commit();

    // 4. Delete Firebase Auth account last (point of no return)
    if (user.auth_id) {
      await adminAuth.deleteUser(user.auth_id).catch((err) => {
        process.stderr.write(`[USER_DELETE] Firebase Auth delete failed for ${user.auth_id}: ${err?.message}\n`);
      });
    }

    await createAuditLog(targetId, req.user?.id ?? null, "USER_DELETE", user, null);

    res.json({ success: true });
  } catch (err) { next(err); }
}

/** GET /api/users/:id/tasks — Admin or the user themselves */
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

/**
 * GET /api/users/task-context
 * Returns only users related to the current user's tasks.
 * Safe fields only: id, first_name, last_name — NO email, NO line_user_id.
 */
export async function getTaskContextUsersHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: "กรุณาเข้าสู่ระบบก่อน" });
      return;
    }

    const users = await getTaskContextUsers(req.user.id);
    res.json(users);
  } catch (err) { next(err); }
}
