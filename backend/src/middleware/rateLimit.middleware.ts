import rateLimit from "express-rate-limit";

/**
 * Rate limiter for login endpoint.
 * 5 attempts per 15 minutes per IP — prevents credential brute-force.
 */
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: { error: "พยายามเข้าสู่ระบบบ่อยเกินไป กรุณารอสักครู่" },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

/**
 * Rate limiter for signup endpoint.
 * Stricter than login: 3 signups per hour per IP.
 * Prevents bot-spam of Firebase Authentication (which incurs cost).
 *
 * NOTE: In production, consider disabling the public signup route entirely
 * and using admin-created accounts (POST /api/users) instead.
 */
export const signupRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: { error: "สร้างบัญชีบ่อยเกินไป กรุณารอสักครู่" },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * General API rate limiter.
 * 120 requests per minute per IP — covers normal usage while blocking abuse.
 *
 * NOTE: For multi-instance / serverless deployments (e.g. Vercel), this
 * in-memory store will not be shared across instances. For production
 * horizontal scaling, replace the store with Redis:
 *   import { RedisStore } from "rate-limit-redis";
 *   store: new RedisStore({ client: redisClient })
 */
export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "คำขอมากเกินไป กรุณารอสักครู่" },
});
