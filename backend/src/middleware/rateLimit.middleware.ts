import rateLimit from "express-rate-limit";
import { createClient, RedisClientType } from "redis";
import { isProductionRuntime } from "../config/runtime.js";

// Redis client for distributed rate limiting
let redisClient: RedisClientType | null = null;

// Initialize Redis client if available
async function getRedisClient(): Promise<RedisClientType | null> {
  if (redisClient) return redisClient;

  // Redis is preferred for distributed rate limiting, but the app can still
  // operate with express-rate-limit's in-memory store when Redis is unavailable.
  if (!process.env.REDIS_URL) {
    if (isProductionRuntime()) {
      console.warn("[RATE_LIMIT] REDIS_URL not configured in production; using per-instance in-memory limits");
      return null;
    }
    console.log("[RATE_LIMIT] Redis not configured, using in-memory store");
    return null;
  }

  try {
    redisClient = createClient({ url: process.env.REDIS_URL });
    await redisClient.connect();
    console.log("[RATE_LIMIT] Connected to Redis for distributed rate limiting");
    return redisClient;
  } catch (err) {
    console.error("[RATE_LIMIT] Failed to connect to Redis:", err);
    console.warn(
      `[RATE_LIMIT] Falling back to in-memory store${isProductionRuntime() ? " in production" : ""} (distributed limits unavailable)`
    );
    return null;
  }
}


/**
 * Redis store compatible with express-rate-limit v8 Store interface.
 * express-rate-limit v8 requires increment() to return { totalHits, resetTime }.
 * Expiry is set per-window so counters reset correctly after the window ends.
 */
class SimpleRedisStore {
  private readonly client: RedisClientType;
  /** Key prefix — named keyPrefix to avoid collision with express-rate-limit Store.prefix */
  private readonly keyPrefix: string = "rl:";
  /** Window duration in seconds — set via init() by express-rate-limit */
  private windowSeconds: number = 60;

  constructor(client: RedisClientType) {
    this.client = client;
  }

  /** Called by express-rate-limit with the limiter options before first use */
  init(options: { windowMs: number }): void {
    this.windowSeconds = Math.ceil(options.windowMs / 1000);
  }

  async increment(key: string): Promise<{ totalHits: number; resetTime: Date }> {
    const k = this.keyPrefix + key;
    const totalHits = await this.client.incr(k);
    if (totalHits === 1) {
      // Set expiry matching the rate-limit window so counters auto-reset
      await this.client.expire(k, this.windowSeconds);
    }
    const ttl = await this.client.ttl(k);
    const resetTime = new Date(Date.now() + ttl * 1000);
    return { totalHits, resetTime };
  }

  async decrement(key: string): Promise<void> {
    await this.client.decr(this.keyPrefix + key);
  }

  async resetKey(key: string): Promise<void> {
    await this.client.del(this.keyPrefix + key);
  }

  async resetAll(): Promise<void> {
    const keys = await this.client.keys(this.keyPrefix + "*");
    if (keys.length > 0) {
      await this.client.del(keys);
    }
  }
}

/**
 * Build a rate-limit store: Redis (distributed, preferred) or in-memory (fallback).
 */
function makeStore(client: RedisClientType | null): SimpleRedisStore | undefined {
  if (!client) return undefined; // express-rate-limit uses its built-in in-memory store
  return new SimpleRedisStore(client);
}

// Top-level await: resolve Redis once before exporting limiters (valid in ESM)
const resolvedRedisClient = await getRedisClient();

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
  store: makeStore(resolvedRedisClient),
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
  store: makeStore(resolvedRedisClient),
});

/**
 * General API rate limiter.
 * 120 requests per minute per IP — covers normal usage while blocking abuse.
 *
 * SECURITY: Uses Redis for distributed rate limiting when available.
 * Falls back to the built-in in-memory store when Redis is unavailable.
 */
export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "คำขอมากเกินไป กรุณารอสักครู่" },
  store: makeStore(resolvedRedisClient),
});
