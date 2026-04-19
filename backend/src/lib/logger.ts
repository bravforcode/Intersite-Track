/**
 * Enterprise-grade structured logging
 * 
 * Features:
 * - Structured JSON logging in production
 * - Human-readable logs in development
 * - Log levels: debug, info, warn, error
 * - Automatic context enrichment
 * - Integration with Sentry, DataDog, etc.
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  [key: string]: unknown;
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  environment: string;
  service: string;
}

const LOG_LEVEL = (process.env.LOG_LEVEL || "info") as LogLevel;
const IS_PRODUCTION = process.env.NODE_ENV === "production";
const SERVICE_NAME = "intersite-track-backend";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[LOG_LEVEL];
}

function formatLogEntry(entry: LogEntry): string {
  if (IS_PRODUCTION) {
    // Structured JSON for production (parseable by log aggregators)
    return JSON.stringify(entry);
  }

  // Human-readable for development
  const timestamp = new Date(entry.timestamp).toLocaleTimeString();
  const levelEmoji = {
    debug: "🔍",
    info: "ℹ️ ",
    warn: "⚠️ ",
    error: "❌",
  }[entry.level];

  let output = `${levelEmoji} [${timestamp}] ${entry.message}`;

  if (entry.context && Object.keys(entry.context).length > 0) {
    output += `\n   Context: ${JSON.stringify(entry.context, null, 2)}`;
  }

  if (entry.error) {
    output += `\n   Error: ${entry.error.name}: ${entry.error.message}`;
    if (entry.error.stack) {
      output += `\n   Stack: ${entry.error.stack}`;
    }
  }

  return output;
}

function log(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
  if (!shouldLog(level)) {
    return;
  }

  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    service: SERVICE_NAME,
  };

  if (context) {
    entry.context = context;
  }

  if (error) {
    entry.error = {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };

    // Send to error tracking service (Sentry, etc.)
    if (IS_PRODUCTION && process.env.SENTRY_DSN) {
      // Sentry integration would go here
      // Sentry.captureException(error, { contexts: { custom: context } });
    }
  }

  const formatted = formatLogEntry(entry);

  // Output to appropriate stream
  if (level === "error") {
    console.error(formatted);
  } else if (level === "warn") {
    console.warn(formatted);
  } else {
    console.log(formatted);
  }
}

export const logger = {
  debug(message: string, context?: LogContext): void {
    log("debug", message, context);
  },

  info(message: string, context?: LogContext): void {
    log("info", message, context);
  },

  warn(message: string, context?: LogContext): void {
    log("warn", message, context);
  },

  error(message: string, contextOrError?: LogContext | Error, error?: Error): void {
    if (contextOrError instanceof Error) {
      log("error", message, undefined, contextOrError);
    } else {
      log("error", message, contextOrError, error);
    }
  },

  /**
   * Log HTTP request
   */
  request(method: string, path: string, statusCode: number, durationMs: number, context?: LogContext): void {
    const level = statusCode >= 500 ? "error" : statusCode >= 400 ? "warn" : "info";
    log(level, `${method} ${path} ${statusCode} ${durationMs}ms`, context);
  },

  /**
   * Log database query
   */
  query(collection: string, operation: string, durationMs: number, context?: LogContext): void {
    log("debug", `DB Query: ${collection}.${operation} (${durationMs}ms)`, context);
  },

  /**
   * Log security event
   */
  security(event: string, context?: LogContext): void {
    log("warn", `SECURITY: ${event}`, context);
  },

  /**
   * Log audit event
   */
  audit(event: string, context?: LogContext): void {
    log("info", `AUDIT: ${event}`, context);
  },
};

/**
 * Express middleware for request logging
 */
export function requestLogger() {
  return (req: any, res: any, next: any) => {
    const start = Date.now();

    // Log when response finishes
    res.on("finish", () => {
      const duration = Date.now() - start;
      const context: LogContext = {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        durationMs: duration,
        ip: req.ip,
        userAgent: req.get("user-agent"),
      };

      // Add user info if authenticated
      if (req.user) {
        context.userId = req.user.uid;
        context.userRole = req.user.role;
      }

      logger.request(req.method, req.path, res.statusCode, duration, context);
    });

    next();
  };
}
