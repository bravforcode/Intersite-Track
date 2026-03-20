import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import pg from "pg";
import crypto from "crypto";
import dotenv from "dotenv";
import multer from "multer";

dotenv.config();

const app = express();
const PORT = 3694;

app.use(express.json());

// File upload setup
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 }, fileFilter: (_req, file, cb) => {
  if (file.mimetype.startsWith("image/")) cb(null, true);
  else cb(new Error("อนุญาตเฉพาะไฟล์รูปภาพเท่านั้น"));
}});
app.use("/uploads", express.static(uploadsDir));

// ============================================
// DATABASE SETUP (PostgreSQL)
// ============================================
const pool = new pg.Pool({
  database: process.env.PGDATABASE || "task",
  user: process.env.PGUSER || "postgres",
  password: process.env.PGPASSWORD || "25800852",
  host: process.env.PGHOST || "localhost",
  port: Number(process.env.PGPORT) || 5432,
});

async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS departments (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE
      );

      CREATE TABLE IF NOT EXISTS task_types (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE
      );

      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        first_name TEXT,
        last_name TEXT,
        role TEXT CHECK(role IN ('admin', 'staff')) DEFAULT 'staff',
        department_id INTEGER REFERENCES departments(id),
        position TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        task_type_id INTEGER REFERENCES task_types(id),
        priority TEXT CHECK(priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
        status TEXT CHECK(status IN ('pending', 'in_progress', 'completed', 'cancelled')) DEFAULT 'pending',
        due_date DATE,
        progress INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by INTEGER REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS task_assignments (
        task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (task_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS task_updates (
        id SERIAL PRIMARY KEY,
        task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id),
        update_text TEXT,
        progress INTEGER,
        attachment_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT DEFAULT 'info',
        reference_id INTEGER,
        is_read INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS task_checklists (
        id SERIAL PRIMARY KEY,
        task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
        parent_id INTEGER,
        title TEXT NOT NULL,
        is_checked INTEGER DEFAULT 0,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Seed data if empty
    const { rows } = await client.query("SELECT count(*) as count FROM departments");
    if (Number(rows[0].count) === 0) {
      await client.query(`
        INSERT INTO departments (name) VALUES
          ('ฝ่ายเทคโนโลยีสารสนเทศ'),
          ('ฝ่ายบุคคล'),
          ('ฝ่ายการเงิน'),
          ('ฝ่ายธุรการ'),
          ('ฝ่ายปฏิบัติการ');

        INSERT INTO task_types (name) VALUES
          ('งานทั่วไป'),
          ('งานเร่งด่วน'),
          ('งานโครงการ'),
          ('งานบำรุงรักษา'),
          ('งานเอกสาร');
      `);

      const hAdmin = hashPassword("admin123");
      const hStaff = hashPassword("staff123");

      await client.query(`
        INSERT INTO users (username, password, first_name, last_name, role, department_id, position) VALUES
          ('admin', $1, 'ผู้ดูแล', 'ระบบ', 'admin', 1, 'ผู้จัดการระบบ'),
          ('somchai', $2, 'สมชาย', 'ใจดี', 'staff', 1, 'เจ้าหน้าที่ IT'),
          ('somying', $2, 'สมหญิง', 'รักงาน', 'staff', 2, 'เจ้าหน้าที่ HR'),
          ('wichai', $2, 'วิชัย', 'มุ่งมั่น', 'staff', 3, 'เจ้าหน้าที่การเงิน'),
          ('pranee', $2, 'ปราณี', 'สุขใจ', 'staff', 4, 'เจ้าหน้าที่ธุรการ');
      `, [hAdmin, hStaff]);

      await client.query(`
        INSERT INTO tasks (title, description, task_type_id, priority, status, due_date, progress, created_by) VALUES
          ('ติดตั้งระบบเครือข่ายใหม่', 'ดำเนินการติดตั้งระบบเครือข่ายสำนักงานชั้น 3', 1, 'high', 'in_progress', '2026-03-20', 45, 1),
          ('จัดทำรายงานประจำเดือน', 'สรุปรายงานผลการดำเนินงานประจำเดือนกุมภาพันธ์', 5, 'medium', 'pending', '2026-03-18', 0, 1),
          ('อบรมพนักงานใหม่', 'จัดอบรมการใช้ระบบให้พนักงานใหม่ 5 คน', 1, 'low', 'completed', '2026-03-10', 100, 1),
          ('ตรวจสอบงบประมาณ Q1', 'ตรวจสอบและสรุปงบประมาณไตรมาสที่ 1', 3, 'urgent', 'pending', '2026-03-15', 0, 1),
          ('ปรับปรุงระบบรักษาความปลอดภัย', 'อัปเดตไฟร์วอลล์และซอฟต์แวร์ป้องกันไวรัส', 4, 'high', 'in_progress', '2026-03-25', 30, 1);

        INSERT INTO task_assignments (task_id, user_id) VALUES
          (1, 2), (2, 3), (2, 4), (3, 3), (4, 4), (5, 2);

        INSERT INTO notifications (user_id, title, message, type, reference_id) VALUES
          (2, 'งานใหม่', 'คุณได้รับมอบหมายงาน: ติดตั้งระบบเครือข่ายใหม่', 'task_assigned', 1),
          (3, 'งานใหม่', 'คุณได้รับมอบหมายงาน: จัดทำรายงานประจำเดือน', 'task_assigned', 2),
          (4, 'งานใหม่', 'คุณได้รับมอบหมายงาน: จัดทำรายงานประจำเดือน', 'task_assigned', 2),
          (4, 'งานเร่งด่วน', 'คุณได้รับมอบหมายงาน: ตรวจสอบงบประมาณ Q1', 'task_assigned', 4);
      `);

      console.log("✅ Seed data inserted successfully");
    }
  } finally {
    client.release();
  }
}

// ============================================
// HELPERS
// ============================================
function hashPassword(pw: string): string {
  return crypto.createHash("sha256").update(pw).digest("hex");
}

async function createNotification(userId: number, title: string, message: string, type: string, referenceId?: number) {
  await pool.query(
    "INSERT INTO notifications (user_id, title, message, type, reference_id) VALUES ($1, $2, $3, $4, $5)",
    [userId, title, message, type, referenceId ?? null]
  );
}

// ============================================
// AUTH
// ============================================
app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "กรุณากรอกข้อมูลให้ครบ" });

    const hashed = hashPassword(password);
    const { rows } = await pool.query(`
      SELECT u.id, u.username, u.first_name, u.last_name, u.role, u.department_id, u.position, d.name as department_name
      FROM users u LEFT JOIN departments d ON u.department_id = d.id
      WHERE u.username = $1 AND u.password = $2
    `, [username, hashed]);

    if (rows.length > 0) {
      res.json(rows[0]);
    } else {
      res.status(401).json({ error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" });
    }
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ============================================
// USER ROUTES
// ============================================
app.get("/api/users", async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT u.id, u.username, u.first_name, u.last_name, u.role, u.department_id, u.position, u.created_at, d.name as department_name
      FROM users u LEFT JOIN departments d ON u.department_id = d.id
      ORDER BY u.id
    `);
    res.json(rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.get("/api/users/:id", async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT u.id, u.username, u.first_name, u.last_name, u.role, u.department_id, u.position, u.created_at, d.name as department_name
      FROM users u LEFT JOIN departments d ON u.department_id = d.id
      WHERE u.id = $1
    `, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: "ไม่พบผู้ใช้" });
    res.json(rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post("/api/users", async (req, res) => {
  const { username, password, first_name, last_name, role, department_id, position } = req.body;
  if (!username || !password || !first_name || !last_name) return res.status(400).json({ error: "กรุณากรอกข้อมูลให้ครบ" });
  try {
    const { rows } = await pool.query(
      "INSERT INTO users (username, password, first_name, last_name, role, department_id, position) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id",
      [username, hashPassword(password), first_name, last_name, role || "staff", department_id || null, position || null]
    );
    res.json({ id: rows[0].id });
  } catch (e: any) {
    res.status(400).json({ error: e.message.includes("unique") || e.message.includes("duplicate") ? "ชื่อผู้ใช้นี้มีอยู่แล้ว" : e.message });
  }
});

app.put("/api/users/:id", async (req, res) => {
  const { username, first_name, last_name, role, department_id, position } = req.body;
  try {
    await pool.query(
      "UPDATE users SET username = $1, first_name = $2, last_name = $3, role = $4, department_id = $5, position = $6 WHERE id = $7",
      [username, first_name, last_name, role, department_id || null, position, req.params.id]
    );
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message.includes("unique") || e.message.includes("duplicate") ? "ชื่อผู้ใช้นี้มีอยู่แล้ว" : e.message });
  }
});

app.delete("/api/users/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM users WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

app.put("/api/users/:id/password", async (req, res) => {
  try {
    const { old_password, new_password } = req.body;
    const { rows } = await pool.query("SELECT password FROM users WHERE id = $1", [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: "ไม่พบผู้ใช้" });
    if (rows[0].password !== hashPassword(old_password)) return res.status(400).json({ error: "รหัสผ่านเดิมไม่ถูกต้อง" });
    await pool.query("UPDATE users SET password = $1 WHERE id = $2", [hashPassword(new_password), req.params.id]);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.get("/api/users/:id/tasks", async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT t.*, u.first_name || ' ' || u.last_name as creator_name, tt.name as task_type_name
      FROM task_assignments ta
      JOIN tasks t ON ta.task_id = t.id
      JOIN users u ON t.created_by = u.id
      LEFT JOIN task_types tt ON t.task_type_id = tt.id
      WHERE ta.user_id = $1
      ORDER BY t.created_at DESC
    `, [req.params.id]);
    res.json(rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ============================================
// DEPARTMENT ROUTES
// ============================================
app.get("/api/departments", async (_req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM departments ORDER BY id");
    res.json(rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post("/api/departments", async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "กรุณาระบุชื่อหน่วยงาน" });
  try {
    const { rows } = await pool.query("INSERT INTO departments (name) VALUES ($1) RETURNING id", [name]);
    res.json({ id: rows[0].id });
  } catch (e: any) { res.status(400).json({ error: "ชื่อหน่วยงานนี้มีอยู่แล้ว" }); }
});

app.put("/api/departments/:id", async (req, res) => {
  const { name } = req.body;
  try {
    await pool.query("UPDATE departments SET name = $1 WHERE id = $2", [name, req.params.id]);
    res.json({ success: true });
  } catch (e: any) { res.status(400).json({ error: "ชื่อหน่วยงานนี้มีอยู่แล้ว" }); }
});

app.delete("/api/departments/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM departments WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (e: any) { res.status(400).json({ error: "ไม่สามารถลบได้ มีผู้ใช้ในหน่วยงานนี้" }); }
});

// ============================================
// TASK TYPE ROUTES
// ============================================
app.get("/api/task-types", async (_req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM task_types ORDER BY id");
    res.json(rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post("/api/task-types", async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "กรุณาระบุชื่อประเภทงาน" });
  try {
    const { rows } = await pool.query("INSERT INTO task_types (name) VALUES ($1) RETURNING id", [name]);
    res.json({ id: rows[0].id });
  } catch (e: any) { res.status(400).json({ error: "ประเภทงานนี้มีอยู่แล้ว" }); }
});

app.put("/api/task-types/:id", async (req, res) => {
  const { name } = req.body;
  try {
    await pool.query("UPDATE task_types SET name = $1 WHERE id = $2", [name, req.params.id]);
    res.json({ success: true });
  } catch (e: any) { res.status(400).json({ error: "ประเภทงานนี้มีอยู่แล้ว" }); }
});

app.delete("/api/task-types/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM task_types WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

// ============================================
// TASK ROUTES
// ============================================
app.get("/api/tasks", async (req, res) => {
  try {
    const { search, status, priority, assignee, date_from, date_to, user_id } = req.query;
    let sql = `
      SELECT t.*, u.first_name || ' ' || u.last_name as creator_name, tt.name as task_type_name
      FROM tasks t
      JOIN users u ON t.created_by = u.id
      LEFT JOIN task_types tt ON t.task_type_id = tt.id
    `;
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIdx = 1;

    if (user_id) {
      sql += ` JOIN task_assignments ta_filter ON t.id = ta_filter.task_id AND ta_filter.user_id = $${paramIdx++} `;
      params.push(user_id);
    }
    if (search) {
      conditions.push(`(t.title ILIKE $${paramIdx} OR t.description ILIKE $${paramIdx + 1})`);
      params.push(`%${search}%`, `%${search}%`);
      paramIdx += 2;
    }
    if (status) { conditions.push(`t.status = $${paramIdx++}`); params.push(status); }
    if (priority) { conditions.push(`t.priority = $${paramIdx++}`); params.push(priority); }
    if (assignee) {
      conditions.push(`t.id IN (SELECT task_id FROM task_assignments WHERE user_id = $${paramIdx++})`);
      params.push(assignee);
    }
    if (date_from) { conditions.push(`t.due_date >= $${paramIdx++}`); params.push(date_from); }
    if (date_to) { conditions.push(`t.due_date <= $${paramIdx++}`); params.push(date_to); }

    if (conditions.length > 0) sql += " WHERE " + conditions.join(" AND ");
    sql += " ORDER BY t.created_at DESC";

    const { rows: tasks } = await pool.query(sql, params);

    // Get assignments for each task
    for (const task of tasks) {
      const { rows: assignments } = await pool.query(
        "SELECT u.id, u.first_name, u.last_name FROM task_assignments ta JOIN users u ON ta.user_id = u.id WHERE ta.task_id = $1",
        [task.id]
      );
      task.assignments = assignments;
    }
    res.json(tasks);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.get("/api/tasks/upcoming", async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT t.*, u.first_name || ' ' || u.last_name as creator_name
      FROM tasks t JOIN users u ON t.created_by = u.id
      WHERE t.status NOT IN ('completed', 'cancelled') AND t.due_date >= CURRENT_DATE AND t.due_date <= CURRENT_DATE + INTERVAL '7 days'
      ORDER BY t.due_date ASC
    `);
    res.json(rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.get("/api/tasks/:id", async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT t.*, u.first_name || ' ' || u.last_name as creator_name, tt.name as task_type_name
      FROM tasks t JOIN users u ON t.created_by = u.id LEFT JOIN task_types tt ON t.task_type_id = tt.id
      WHERE t.id = $1
    `, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: "ไม่พบงาน" });
    const task = rows[0];
    const { rows: assignments } = await pool.query(
      "SELECT u.id, u.first_name, u.last_name FROM task_assignments ta JOIN users u ON ta.user_id = u.id WHERE ta.task_id = $1",
      [task.id]
    );
    task.assignments = assignments;
    res.json(task);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post("/api/tasks", async (req, res) => {
  const { title, description, task_type_id, priority, due_date, created_by, assigned_user_ids } = req.body;
  if (!title) return res.status(400).json({ error: "กรุณาระบุชื่องาน" });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      "INSERT INTO tasks (title, description, task_type_id, priority, due_date, created_by) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
      [title, description, task_type_id || null, priority || "medium", due_date, created_by]
    );
    const taskId = rows[0].id;

    if (assigned_user_ids && Array.isArray(assigned_user_ids)) {
      for (const uid of assigned_user_ids) {
        await client.query("INSERT INTO task_assignments (task_id, user_id) VALUES ($1, $2)", [taskId, uid]);
        await createNotification(uid, "งานใหม่", `คุณได้รับมอบหมายงาน: ${title}`, "task_assigned", taskId);
      }
    }
    await client.query("COMMIT");
    res.json({ id: taskId });
  } catch (e: any) {
    await client.query("ROLLBACK");
    res.status(400).json({ error: e.message });
  } finally {
    client.release();
  }
});

app.put("/api/tasks/:id", async (req, res) => {
  const { title, description, task_type_id, priority, status, due_date, assigned_user_ids } = req.body;
  const taskId = Number(req.params.id);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "UPDATE tasks SET title = $1, description = $2, task_type_id = $3, priority = $4, status = $5, due_date = $6, updated_at = CURRENT_TIMESTAMP WHERE id = $7",
      [title, description, task_type_id || null, priority, status, due_date, taskId]
    );

    // Get current assignments for comparison
    const { rows: currentAssignments } = await client.query("SELECT user_id FROM task_assignments WHERE task_id = $1", [taskId]);
    const currentIds = currentAssignments.map(a => a.user_id);

    // Rebuild assignments
    await client.query("DELETE FROM task_assignments WHERE task_id = $1", [taskId]);
    if (assigned_user_ids && Array.isArray(assigned_user_ids)) {
      for (const uid of assigned_user_ids) {
        await client.query("INSERT INTO task_assignments (task_id, user_id) VALUES ($1, $2)", [taskId, uid]);
        if (!currentIds.includes(uid)) {
          await createNotification(uid, "งานใหม่", `คุณได้รับมอบหมายงาน: ${title}`, "task_assigned", taskId);
        }
      }
      // Notify all assignees about edit
      for (const uid of assigned_user_ids) {
        await createNotification(uid, "แก้ไขงาน", `งาน "${title}" ได้รับการแก้ไข`, "task_updated", taskId);
      }
    }
    await client.query("COMMIT");
    res.json({ success: true });
  } catch (e: any) {
    await client.query("ROLLBACK");
    res.status(400).json({ error: e.message });
  } finally {
    client.release();
  }
});

app.patch("/api/tasks/:id/status", async (req, res) => {
  try {
    const { status, progress } = req.body;
    const taskId = Number(req.params.id);
    await pool.query("UPDATE tasks SET status = $1, progress = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3", [status, progress ?? 0, taskId]);

    const { rows: taskRows } = await pool.query("SELECT title FROM tasks WHERE id = $1", [taskId]);
    const { rows: assignments } = await pool.query("SELECT user_id FROM task_assignments WHERE task_id = $1", [taskId]);
    const statusThai: Record<string, string> = { pending: "รอดำเนินการ", in_progress: "กำลังดำเนินการ", completed: "เสร็จสิ้น", cancelled: "ยกเลิก" };
    for (const a of assignments) {
      await createNotification(a.user_id, "สถานะเปลี่ยน", `งาน "${taskRows[0].title}" เปลี่ยนสถานะเป็น: ${statusThai[status] || status}`, "status_changed", taskId);
    }
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.delete("/api/tasks/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM tasks WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

// ============================================
// TASK UPDATE ROUTES
// ============================================
app.get("/api/tasks/:id/updates", async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT tu.*, u.first_name, u.last_name
      FROM task_updates tu JOIN users u ON tu.user_id = u.id
      WHERE tu.task_id = $1 ORDER BY tu.created_at DESC
    `, [req.params.id]);
    res.json(rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post("/api/upload", upload.single("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "ไม่พบไฟล์" });
  res.json({ url: `/uploads/${req.file.filename}` });
});

app.post("/api/tasks/:id/updates", async (req, res) => {
  const { user_id, update_text, progress, attachment_url } = req.body;
  const taskId = Number(req.params.id);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "INSERT INTO task_updates (task_id, user_id, update_text, progress, attachment_url) VALUES ($1, $2, $3, $4, $5)",
      [taskId, user_id, update_text, progress, attachment_url || null]
    );

    let newStatus = "in_progress";
    if (progress >= 100) newStatus = "completed";
    await client.query("UPDATE tasks SET progress = $1, status = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3", [progress, newStatus, taskId]);

    const { rows: taskRows } = await client.query("SELECT title, created_by FROM tasks WHERE id = $1", [taskId]);
    if (taskRows[0].created_by !== user_id) {
      await createNotification(taskRows[0].created_by, "อัปเดตงาน", `งาน "${taskRows[0].title}" มีการอัปเดตความคืบหน้า (${progress}%)`, "task_updated", taskId);
    }
    await client.query("COMMIT");
    res.json({ success: true });
  } catch (e: any) {
    await client.query("ROLLBACK");
    res.status(400).json({ error: e.message });
  } finally {
    client.release();
  }
});

// ============================================
// CHECKLIST ROUTES
// ============================================
app.get("/api/tasks/:id/checklists", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM task_checklists WHERE task_id = $1 ORDER BY sort_order, id",
      [req.params.id]
    );
    res.json(rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post("/api/tasks/:id/checklists", async (req, res) => {
  const taskId = Number(req.params.id);
  const { items } = req.body; // array of { id?, title, parent_id?, is_checked?, sort_order, children?: [] }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM task_checklists WHERE task_id = $1", [taskId]);

    for (const item of items) {
      const { rows } = await client.query(
        "INSERT INTO task_checklists (task_id, parent_id, title, is_checked, sort_order) VALUES ($1, $2, $3, $4, $5) RETURNING id",
        [taskId, null, item.title, item.is_checked ? 1 : 0, item.sort_order || 0]
      );
      const parentId = rows[0].id;
      if (item.children && Array.isArray(item.children)) {
        for (const child of item.children) {
          await client.query(
            "INSERT INTO task_checklists (task_id, parent_id, title, is_checked, sort_order) VALUES ($1, $2, $3, $4, $5)",
            [taskId, parentId, child.title, child.is_checked ? 1 : 0, child.sort_order || 0]
          );
        }
      }
    }
    // Auto-calculate progress from checklist and update task
    const { rows: allItems } = await client.query(
      "SELECT is_checked FROM task_checklists WHERE task_id = $1", [taskId]
    );
    const totalCount = allItems.length;
    const checkedCount = allItems.filter((r: any) => r.is_checked === 1).length;
    const pct = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;
    const newStatus = pct >= 100 ? 'completed' : pct > 0 ? 'in_progress' : 'pending';
    await client.query(
      "UPDATE tasks SET progress = $1, status = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3",
      [pct, newStatus, taskId]
    );

    await client.query("COMMIT");
    res.json({ success: true, progress: pct });
  } catch (e: any) {
    await client.query("ROLLBACK");
    res.status(400).json({ error: e.message });
  } finally {
    client.release();
  }
});

app.patch("/api/checklists/:id/toggle", async (req, res) => {
  try {
    await pool.query("UPDATE task_checklists SET is_checked = CASE WHEN is_checked = 0 THEN 1 ELSE 0 END WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ============================================
// NOTIFICATION ROUTES
// ============================================
app.get("/api/notifications/:userId", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50",
      [req.params.userId]
    );
    res.json(rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.get("/api/notifications/:userId/unread-count", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT count(*) as count FROM notifications WHERE user_id = $1 AND is_read = 0", [req.params.userId]);
    res.json({ count: Number(rows[0].count) });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.patch("/api/notifications/:id/read", async (req, res) => {
  try {
    await pool.query("UPDATE notifications SET is_read = 1 WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.patch("/api/notifications/read-all/:userId", async (req, res) => {
  try {
    await pool.query("UPDATE notifications SET is_read = 1 WHERE user_id = $1", [req.params.userId]);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ============================================
// STATS & REPORTS
// ============================================
app.get("/api/stats", async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        count(*) as total,
        count(*) FILTER (WHERE status = 'completed') as completed,
        count(*) FILTER (WHERE status = 'in_progress') as "inProgress",
        count(*) FILTER (WHERE status = 'pending') as pending,
        count(*) FILTER (WHERE status = 'cancelled') as cancelled
      FROM tasks
    `);
    const r = rows[0];
    res.json({ total: Number(r.total), completed: Number(r.completed), inProgress: Number(r.inProgress), pending: Number(r.pending), cancelled: Number(r.cancelled) });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.get("/api/reports/by-staff", async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT u.id, u.first_name, u.last_name, u.position, d.name as department_name,
        COUNT(ta.task_id)::int as total_tasks,
        COUNT(ta.task_id) FILTER (WHERE t.status = 'completed')::int as completed,
        COUNT(ta.task_id) FILTER (WHERE t.status = 'in_progress')::int as in_progress,
        COUNT(ta.task_id) FILTER (WHERE t.status = 'pending')::int as pending
      FROM users u
      LEFT JOIN task_assignments ta ON u.id = ta.user_id
      LEFT JOIN tasks t ON ta.task_id = t.id
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE u.role = 'staff'
      GROUP BY u.id, u.first_name, u.last_name, u.position, d.name
      ORDER BY total_tasks DESC
    `);
    res.json(rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.get("/api/reports/by-date-range", async (req, res) => {
  try {
    const { start, end } = req.query;
    const s = start || "2000-01-01";
    const e = end || "2099-12-31";
    const { rows } = await pool.query(`
      SELECT t.due_date::text, t.status, COUNT(*)::int as count
      FROM tasks t
      WHERE t.due_date BETWEEN $1 AND $2
      GROUP BY t.due_date, t.status
      ORDER BY t.due_date
    `, [s, e]);
    res.json(rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.get("/api/reports/export-csv", async (_req, res) => {
  try {
    const { rows: tasks } = await pool.query(`
      SELECT t.id, t.title, t.description, t.priority, t.status, t.due_date::text, t.progress, t.created_at::text,
        u.first_name || ' ' || u.last_name as creator_name, tt.name as task_type_name
      FROM tasks t
      JOIN users u ON t.created_by = u.id
      LEFT JOIN task_types tt ON t.task_type_id = tt.id
      ORDER BY t.created_at DESC
    `);

    const header = "ID,ชื่องาน,รายละเอียด,ประเภท,ระดับความสำคัญ,สถานะ,กำหนดส่ง,ความคืบหน้า(%),ผู้สร้าง,วันที่สร้าง\n";
    const csvRows = tasks.map(t =>
      `${t.id},"${(t.title || '').replace(/"/g, '""')}","${(t.description || '').replace(/"/g, '""')}","${t.task_type_name || ''}","${t.priority}","${t.status}","${t.due_date}",${t.progress},"${t.creator_name}","${t.created_at}"`
    ).join("\n");

    const bom = "\uFEFF";
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=tasks_report.csv");
    res.send(bom + header + csvRows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ============================================
// SERVER SETUP
// ============================================
async function startServer() {
  // Initialize database tables and seed data
  try {
    await initDB();
    console.log("✅ PostgreSQL connected & tables ready");
  } catch (e: any) {
    console.error("❌ Database initialization failed:", e.message);
    process.exit(1);
  }

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
