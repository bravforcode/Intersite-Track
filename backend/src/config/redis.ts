import { createClient, RedisClientType } from "redis";
import { isProductionRuntime } from "./runtime.js";

let redisClient: RedisClientType | null = null;
let connectionAttempted = false;

/**
 * Get or create Redis client for distributed caching and rate limiting.
 * 
 * PRODUCTION REQUIREMENT:
 * - Redis is REQUIRED for production deployments
 * - Without Redis, rate limiting is per-instance (ineffective in serverless)
 * - Recommended providers: Upstash, Redis Cloud, AWS ElastiCache
 * 
 * DEVELOPMENT:
 * - Redis is optional in development
 * - Falls back to in-memory store gracefully
 */
export async function getRedisClient(): Promise<RedisClientType | null> {
  // Return existing client if already connected
  if (redisClient?.isOpen) {
    return redisClient;
  }

  // Don't retry connection if already attempted and failed
  if (connectionAttempted && !redisClient) {
    return null;
  }

  connectionAttempted = true;

  // Check if Redis URL is configured
  if (!process.env.REDIS_URL) {
    if (isProductionRuntime()) {
      console.error("❌ [REDIS] REDIS_URL not configured in production");
      console.error("❌ [REDIS] Distributed rate limiting and caching DISABLED");
      console.error("❌ [REDIS] This is a CRITICAL security issue in production");
      console.error("💡 [REDIS] Set REDIS_URL in Vercel Environment Variables");
    } else {
      console.log("ℹ️  [REDIS] Redis not configured, using in-memory fallback");
    }
    return null;
  }

  try {
    // Create Redis client with production-ready configuration
    redisClient = createClient({
      url: process.env.REDIS_URL,
      socket: {
        // Connection timeout
        connectTimeout: 5000,
        // Keep connection alive
        keepAlive: 5000,
        // Reconnect strategy
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            console.error("[REDIS] Max reconnection attempts reached");
            return new Error("Max reconnection attempts reached");
          }
          // Exponential backoff: 50ms, 100ms, 200ms, 400ms, ...
          return Math.min(retries * 50, 3000);
        },
      },
      // Disable offline queue in production to fail fast
      disableOfflineQueue: isProductionRuntime(),
    });

    // Error handler
    redisClient.on("error", (err) => {
      console.error("[REDIS] Client error:", err);
    });

    // Connection handler
    redisClient.on("connect", () => {
      console.log("✅ [REDIS] Connecting...");
    });

    // Ready handler
    redisClient.on("ready", () => {
      console.log("✅ [REDIS] Connected and ready");
    });

    // Reconnecting handler
    redisClient.on("reconnecting", () => {
      console.warn("⚠️  [REDIS] Reconnecting...");
    });

    // Disconnect handler
    redisClient.on("end", () => {
      console.warn("⚠️  [REDIS] Connection closed");
    });

    // Connect to Redis
    await redisClient.connect();

    // Test connection with ping
    const pong = await redisClient.ping();
    if (pong !== "PONG") {
      throw new Error("Redis ping failed");
    }

    console.log("✅ [REDIS] Connection verified");
    return redisClient;
  } catch (err) {
    console.error("[REDIS] Failed to connect:", err);
    
    if (isProductionRuntime()) {
      console.error("❌ [REDIS] Production deployment without Redis is NOT RECOMMENDED");
      console.error("❌ [REDIS] Rate limiting and caching will be ineffective");
    } else {
      console.warn("⚠️  [REDIS] Falling back to in-memory store");
    }

    redisClient = null;
    return null;
  }
}

/**
 * Get current Redis client (may be null if not connected)
 */
export function getRedisClientSync(): RedisClientType | null {
  return redisClient?.isOpen ? redisClient : null;
}

/**
 * Close Redis connection gracefully
 */
export async function closeRedisConnection(): Promise<void> {
  if (redisClient?.isOpen) {
    try {
      await redisClient.quit();
      console.log("✅ [REDIS] Connection closed gracefully");
    } catch (err) {
      console.error("[REDIS] Error closing connection:", err);
      // Force disconnect if graceful quit fails
      await redisClient.disconnect();
    }
  }
  redisClient = null;
  connectionAttempted = false;
}

/**
 * Health check for Redis connection
 */
export async function checkRedisHealth(): Promise<{
  status: "ok" | "degraded" | "unavailable";
  message: string | null;
  latencyMs?: number;
}> {
  const client = getRedisClientSync();

  if (!client) {
    return {
      status: "unavailable",
      message: "Redis client not initialized",
    };
  }

  try {
    const start = Date.now();
    await client.ping();
    const latencyMs = Date.now() - start;

    return {
      status: latencyMs < 100 ? "ok" : "degraded",
      message: latencyMs >= 100 ? `High latency: ${latencyMs}ms` : null,
      latencyMs,
    };
  } catch (err) {
    return {
      status: "degraded",
      message: err instanceof Error ? err.message : String(err),
    };
  }
}
