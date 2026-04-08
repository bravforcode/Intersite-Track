import express, { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import { notFound, errorHandler } from "../../server/middleware/error.middleware.js";
import {
  getNotifications,
  getUnreadNotificationCount,
  markRead,
  markAllRead,
} from "../../server/controllers/notification.controller.js";

export interface TestUser {
  id: string;
  userId: string;
  authId: string;
  email: string | null;
  username: string;
  role: string;
  first_name: string;
  last_name: string;
  department_id: string | null;
  position: string | null;
  created_at?: string;
}

/**
 * Create mock requireAuth middleware that uses test users instead of Firebase
 */
function createMockAuthMiddleware(testUsers: Map<string, TestUser>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    let token: string | undefined;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    } else if (req.query.token && typeof req.query.token === "string") {
      token = req.query.token;
    }

    if (!token) {
      res.status(401).json({ error: "กรุณาเข้าสู่ระบบก่อน" });
      return;
    }

    const user = testUsers.get(token);
    if (!user) {
      res.status(401).json({ error: "Token ไม่ถูกต้อง" });
      return;
    }

    (req as any).user = user;
    next();
  };
}

/**
 * Create Express app for testing
 * Uses mocked auth middleware instead of Firebase
 */
export function createTestApp(
  testUsers: Map<string, TestUser> = new Map()
): Express {
  const app = express();

  // Security: HTTP headers
  app.use(helmet({ contentSecurityPolicy: false }));

  // Security: CORS
  app.use(cors({
    origin: true,
    credentials: true,
  }));

  // Body size limit
  app.use(express.json({
    limit: "1mb",
    verify: (req, _res, buf) => {
      (req as express.Request).rawBody = Buffer.from(buf);
    },
  }));

  // Mount notification routes with mock auth
  const mockAuthMiddleware = createMockAuthMiddleware(testUsers);

  // Create notification router directly
  const notificationRouter = express.Router();

  notificationRouter.get("/:userId", mockAuthMiddleware, getNotifications);
  notificationRouter.get(
    "/:userId/unread-count",
    mockAuthMiddleware,
    getUnreadNotificationCount
  );
  notificationRouter.patch("/:id/read", mockAuthMiddleware, markRead);
  notificationRouter.patch("/read-all/:userId", mockAuthMiddleware, markAllRead);

  app.use("/api/notifications", notificationRouter);

  // Error handling
  app.use(notFound);
  app.use(errorHandler);

  return app;
}

export interface TestAppFactory {
  app: Express;
  testUsers: Map<string, TestUser>;
}

/**
 * Create a test app with user management
 */
export function createTestAppFactory(): TestAppFactory {
  const testUsers = new Map<string, TestUser>();
  return {
    app: createTestApp(testUsers),
    testUsers,
  };
}
