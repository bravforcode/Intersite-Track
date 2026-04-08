import { Request, Response, NextFunction } from "express";

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

// Store for mock users during tests
let mockUsers = new Map<string, TestUser>();

/**
 * Register a mock user for testing
 */
export function registerMockUser(token: string, user: TestUser): void {
  mockUsers.set(token, user);
}

/**
 * Clear all mock users
 */
export function clearMockUsers(): void {
  mockUsers.clear();
}

/**
 * Mock requireAuth middleware that uses mock users instead of Firebase
 */
export function mockRequireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
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

  const user = mockUsers.get(token);
  if (!user) {
    res.status(401).json({ error: "Token ไม่ถูกต้อง" });
    return;
  }

  (req as any).user = user;
  next();
}

/**
 * Mock requireRole middleware
 */
export function mockRequireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "กรุณาเข้าสู่ระบบก่อน" });
      return;
    }

    if (!roles.includes((req as any).user.role)) {
      res.status(403).json({ error: "คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้" });
      return;
    }

    next();
  };
}
