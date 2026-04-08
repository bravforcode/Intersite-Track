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

/**
 * Create a test user object for mocking
 */
export function createTestUser(
  userId: string,
  role: string = "staff"
): TestUser {
  return {
    id: userId,
    userId,
    authId: userId,
    email: `${userId}@test.com`,
    username: userId,
    role,
    first_name: "Test",
    last_name: "User",
    department_id: null,
    position: null,
    created_at: new Date().toISOString(),
  };
}

/**
 * Create a middleware that mocks authentication with a specific test user
 */
export function mockAuthMiddleware(testUser: TestUser | null) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (testUser) {
      (req as any).user = testUser;
    }
    next();
  };
}
