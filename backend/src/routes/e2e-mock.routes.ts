import express, { Request, Response, NextFunction } from "express";
import multer from "multer";

type Role = "admin" | "staff";

type MockUser = {
  id: string;
  username: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: Role;
  department_id: string | null;
  position: string;
};

type MockTask = {
  id: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "urgent";
  created_by: string;
  assigned_user_ids: string[];
};

type ApiUser = Omit<MockUser, "password">;

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

function getEnv(name: string, fallback: string): string {
  return process.env[name]?.trim() || fallback;
}

const baseUsers: MockUser[] = [
  {
    id: "u-admin",
    username: "admin",
    email: getEnv("E2E_ADMIN_EMAIL", "admin@taskam.local").toLowerCase(),
    password: getEnv("E2E_ADMIN_PASSWORD", "admin123"),
    first_name: getEnv("E2E_ADMIN_NAME", "แอดมิน"),
    last_name: "",
    role: "admin",
    department_id: null,
    position: "Admin",
  },
  {
    id: "u-staff",
    username: "staff",
    email: getEnv("E2E_STAFF_EMAIL", "somchai@taskam.local").toLowerCase(),
    password: getEnv("E2E_STAFF_PASSWORD", "staff123"),
    first_name: getEnv("E2E_STAFF_NAME", "สมชาย"),
    last_name: "",
    role: "staff",
    department_id: null,
    position: "Staff",
  },
];

const usersByEmail = new Map(baseUsers.map((u) => [u.email, u]));
const usersById = new Map(baseUsers.map((u) => [u.id, u]));
const tokens = new Map<string, string>();
const tasks = new Map<string, MockTask>();
const files = new Map<string, { id: string; ownerId: string; contentType: string; originalName: string; buffer: Buffer }>();

function toApiUser(user: MockUser): ApiUser {
  const { password: _password, ...rest } = user;
  return rest;
}

function createTokenForUser(userId: string): string {
  const token = `e2e-${userId}-${Math.random().toString(16).slice(2)}`;
  tokens.set(token, userId);
  return token;
}

function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const userId = token ? tokens.get(token) : undefined;
  if (!userId) {
    res.status(401).json({ error: "กรุณาเข้าสู่ระบบก่อน" });
    return;
  }
  const user = usersById.get(userId);
  if (!user) {
    res.status(401).json({ error: "Token ไม่ถูกต้อง" });
    return;
  }
  (req as any).user = toApiUser(user);
  next();
}

function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user as ApiUser | undefined;
    if (!user) {
      res.status(401).json({ error: "กรุณาเข้าสู่ระบบก่อน" });
      return;
    }
    if (!roles.includes(user.role)) {
      res.status(403).json({ error: "คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้" });
      return;
    }
    next();
  };
}

router.post("/auth/mock-login", (req, res) => {
  const email = String(req.body?.email ?? "").trim().toLowerCase();
  const password = String(req.body?.password ?? "");
  const user = usersByEmail.get(email);
  if (!user || user.password !== password) {
    res.status(401).json({ error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });
    return;
  }
  const token = createTokenForUser(user.id);
  res.json({ token, user: toApiUser(user) });
});

router.post("/auth/profile", requireAuth, (req, res) => {
  res.json((req as any).user);
});

router.get("/users", requireAuth, requireRole("admin"), (_req, res) => {
  res.json(baseUsers.map(toApiUser));
});

router.get("/users/task-context", requireAuth, (_req, res) => {
  const safe = baseUsers.map((u) => ({
    id: u.id,
    first_name: u.first_name,
    last_name: u.last_name,
    role: u.role,
    position: u.position,
  }));
  res.json(safe);
});

router.get("/tasks/workspace", requireAuth, (req, res) => {
  const user = (req as any).user as ApiUser;
  const requestedUserId = typeof req.query.user_id === "string" ? req.query.user_id : undefined;
  const userId = user.role === "staff" ? user.id : requestedUserId;

  const data = Array.from(tasks.values()).filter((t) => {
    if (!userId) return true;
    return t.created_by === userId || t.assigned_user_ids.includes(userId);
  });

  const users =
    user.role === "admin"
      ? baseUsers.map(toApiUser)
      : Array.from(
          new Map(
            baseUsers.map((u) => [
              u.id,
              {
                id: u.id,
                first_name: u.first_name,
                last_name: u.last_name,
                role: u.role,
                position: u.position,
              },
            ])
          ).values()
        );

  res.json({
    data,
    users,
    taskTypes: [
      { id: "general", name: "ทั่วไป" },
      { id: "admin_only", name: "แอดมินเท่านั้น" },
    ],
  });
});

router.get("/tasks/:id", requireAuth, (req, res) => {
  const task = tasks.get(req.params.id);
  if (!task) {
    res.status(404).json({ error: "ไม่พบงาน" });
    return;
  }
  res.json(task);
});

router.post("/tasks", requireAuth, requireRole("admin"), (req, res) => {
  const title = String(req.body?.title ?? "").trim();
  if (!title) {
    res.status(400).json({ error: "กรุณาระบุชื่องาน (ข้อความไม่ว่าง)" });
    return;
  }

  const user = (req as any).user as ApiUser;
  const id = `t-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const task: MockTask = {
    id,
    title,
    description: String(req.body?.description ?? ""),
    priority: (req.body?.priority as MockTask["priority"]) ?? "medium",
    created_by: user.id,
    assigned_user_ids: [],
  };
  tasks.set(id, task);
  res.status(201).json({ id });
});

router.get("/tasks/global/activity", requireAuth, requireRole("admin"), (_req, res) => {
  res.json({ data: [] });
});

router.post("/tasks/:taskId/upload", requireAuth, requireRole("admin"), upload.single("image"), (req, res) => {
  const file = req.file;
  if (!file) {
    res.status(400).json({ error: "ไม่พบไฟล์" });
    return;
  }

  const user = (req as any).user as ApiUser;
  const fileId = `f-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  files.set(fileId, {
    id: fileId,
    ownerId: user.id,
    contentType: file.mimetype || "application/octet-stream",
    originalName: file.originalname,
    buffer: file.buffer,
  });

  res.status(201).json({
    file_id: fileId,
    download_url: `/api/files/${fileId}/download`,
    original_name: file.originalname,
  });
});

router.get("/files/:fileId/download", requireAuth, (req, res) => {
  const user = (req as any).user as ApiUser;
  const file = files.get(req.params.fileId);
  if (!file) {
    res.status(404).json({ error: "ไม่พบไฟล์" });
    return;
  }
  if (file.ownerId !== user.id && user.role !== "admin") {
    res.status(403).json({ error: "คุณไม่มีสิทธิ์เข้าถึงไฟล์นี้" });
    return;
  }

  res.setHeader("Content-Type", file.contentType);
  res.status(200).send(file.buffer);
});

router.get("/notifications/:userId/unread-count", requireAuth, (req, res) => {
  const user = (req as any).user as ApiUser;
  const userId = req.params.userId;
  if (user.role !== "admin" && user.id !== userId) {
    res.status(403).json({ error: "คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้" });
    return;
  }
  res.json({ count: 0 });
});

export default router;

