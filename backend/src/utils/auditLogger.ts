import { Request } from "express";
import { db } from "../config/firebase-admin.js";
import { FieldValue } from "firebase-admin/firestore";

/**
 * Audit event types for tracking sensitive operations
 * CWE-778: Insufficient Logging of Access Events
 * CWE-532: Insertion of Sensitive Information into Log File
 */
export enum AuditEventType {
  // Authentication events
  LOGIN_SUCCESS = "LOGIN_SUCCESS",
  LOGIN_FAILED = "LOGIN_FAILED",
  LOGOUT = "LOGOUT",
  TOKEN_REVOKED = "TOKEN_REVOKED",
  PASSWORD_CHANGED = "PASSWORD_CHANGED",

  // Authorization events
  PERMISSION_DENIED = "PERMISSION_DENIED",
  UNAUTHORIZED_ACCESS = "UNAUTHORIZED_ACCESS",

  // User management
  USER_CREATED = "USER_CREATED",
  USER_UPDATED = "USER_UPDATED",
  USER_DELETED = "USER_DELETED",
  ROLE_CHANGED = "ROLE_CHANGED",

  // Admin operations
  ADMIN_ACTION = "ADMIN_ACTION",
  SETTINGS_CHANGED = "SETTINGS_CHANGED",
  CONFIG_DEPLOYED = "CONFIG_DEPLOYED",

  // File operations
  FILE_UPLOADED = "FILE_UPLOADED",
  FILE_DELETED = "FILE_DELETED",
  FILE_ACCESSED = "FILE_ACCESSED",

  // Data operations
  DATA_EXPORTED = "DATA_EXPORTED",
  DATA_IMPORTED = "DATA_IMPORTED",
  BULK_OPERATION = "BULK_OPERATION",

  // Security events
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",
  CSRF_TOKEN_INVALID = "CSRF_TOKEN_INVALID",
  SUSPICIOUS_ACTIVITY = "SUSPICIOUS_ACTIVITY",

  // API events
  API_ERROR = "API_ERROR",
  EXTERNAL_API_CALL = "EXTERNAL_API_CALL",

  // Legacy task audit
  TASK_MODIFIED = "TASK_MODIFIED",
}

/**
 * Severity levels for audit events
 */
export enum AuditSeverity {
  INFO = "INFO",
  WARNING = "WARNING",
  CRITICAL = "CRITICAL",
}

/**
 * Audit log entry structure
 * Sanitized to prevent sensitive data exposure
 */
export interface AuditLogEntry {
  eventType: AuditEventType;
  severity: AuditSeverity;
  userId?: string;
  username?: string;
  userRole?: string;
  email?: string;
  action: string;
  resource: string;
  resourceId?: string;
  resourceType?: string;
  status: "SUCCESS" | "FAILURE";
  statusCode?: number;
  errorMessage?: string;
  changes?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: FieldValue;
  metadata?: Record<string, unknown>;
}

/**
 * Sanitizes sensitive data to prevent exposure in audit logs
 * CWE-532: Never log passwords, tokens, secrets, PII
 */
export function sanitizeAuditPayload(value: unknown): unknown {
  if (value === undefined) return null;
  if (value === null) return null;

  // Sensitive field patterns
  const sensitivePatterns = ["password", "token", "secret", "apiKey", "ssn", "creditCard", "auth"];

  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizeAuditPayload(item))
      .filter((item) => item !== undefined);
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, entryValue]) => entryValue !== undefined)
      .map(([key, entryValue]) => {
        const lowerKey = key.toLowerCase();
        if (sensitivePatterns.some((p) => lowerKey.includes(p))) {
          return [key, "[REDACTED]"];
        }
        return [key, sanitizeAuditPayload(entryValue)];
      });
    return Object.fromEntries(entries);
  }

  return value;
}

/**
 * Extracts relevant request metadata for audit logging
 */
function extractRequestMetadata(req: Request): {
  ipAddress: string;
  userAgent: string;
} {
  const ipAddress = (req.ip || req.socket.remoteAddress || "UNKNOWN").split(",")[0].trim();
  const userAgent = req.get("user-agent") || "UNKNOWN";

  return {
    ipAddress,
    userAgent,
  };
}

/**
 * Creates an audit log entry in Firestore
 * Ensures no sensitive data is logged
 */
export async function createAuditLog(
  taskId: string,
  userId: string | null,
  action: string,
  oldData: any = null,
  newData: any = null
): Promise<void> {
  try {
    await db.collection("task_audit_logs").add({
      task_id: taskId,
      user_id: userId,
      action,
      old_data: sanitizeAuditPayload(oldData),
      new_data: sanitizeAuditPayload(newData),
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`[AUDIT_ERROR] Failed to log task audit event: ${errMsg}\n`);
  }
}

/**
 * Log a comprehensive audit event
 */
export async function logAuditEvent(
  entry: Omit<AuditLogEntry, "timestamp">,
  req?: Request
): Promise<string> {
  try {
    const reqMeta = req ? extractRequestMetadata(req) : { ipAddress: undefined, userAgent: undefined };
    const sanitizedChanges = entry.changes ? sanitizeAuditPayload(entry.changes) : undefined;
    const sanitizedMetadata = entry.metadata ? sanitizeAuditPayload(entry.metadata) : undefined;

    const auditEntry: AuditLogEntry = {
      ...entry,
      changes: sanitizedChanges as Record<string, unknown>,
      metadata: sanitizedMetadata as Record<string, unknown>,
      ipAddress: reqMeta.ipAddress || entry.ipAddress,
      userAgent: reqMeta.userAgent || entry.userAgent,
      timestamp: FieldValue.serverTimestamp(),
    };

    // ✅ Use parameterized query (no injection risk)
    const sanitizedEntry = sanitizeAuditPayload(auditEntry) as Record<string, unknown>;
    const docRef = await db.collection("audit_logs").add(sanitizedEntry);

    // Also log to stderr for real-time monitoring
    const logLine = `[AUDIT] ${entry.eventType} | User: ${entry.username || entry.userId || "ANONYMOUS"} | Resource: ${entry.resource} | Status: ${entry.status}`;
    process.stderr.write(`${logLine}\n`);

    return docRef.id;
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`[AUDIT_ERROR] Failed to log audit event: ${errMsg}\n`);
    // Don't throw - audit logging should never break the application
    return "ERROR";
  }
}

/**
 * Auth event logging helpers
 */
export async function logLoginAttempt(
  username: string,
  success: boolean,
  req?: Request,
  errorMessage?: string
): Promise<string> {
  return logAuditEvent(
    {
      eventType: success ? AuditEventType.LOGIN_SUCCESS : AuditEventType.LOGIN_FAILED,
      severity: success ? AuditSeverity.INFO : AuditSeverity.WARNING,
      username,
      action: "Authentication attempt",
      resource: "AUTH",
      status: success ? "SUCCESS" : "FAILURE",
      errorMessage: success ? undefined : errorMessage,
    },
    req
  );
}

export async function logLogout(userId: string, username: string, req?: Request): Promise<string> {
  return logAuditEvent(
    {
      eventType: AuditEventType.LOGOUT,
      severity: AuditSeverity.INFO,
      userId,
      username,
      action: "User logout",
      resource: "AUTH",
      status: "SUCCESS",
    },
    req
  );
}

/**
 * User management event logging
 */
export async function logUserCreated(
  userId: string,
  username: string,
  role: string,
  req?: Request
): Promise<string> {
  return logAuditEvent(
    {
      eventType: AuditEventType.USER_CREATED,
      severity: AuditSeverity.INFO,
      userId: req?.user?.id,
      username: req?.user?.username,
      action: "User account created",
      resource: "USER",
      resourceId: userId,
      resourceType: "user",
      status: "SUCCESS",
      changes: { created_user: username, role },
    },
    req
  );
}

export async function logUserUpdated(
  targetUserId: string,
  _targetUsername: string,
  changes: Record<string, unknown>,
  req?: Request
): Promise<string> {
  return logAuditEvent(
    {
      eventType: AuditEventType.USER_UPDATED,
      severity: AuditSeverity.INFO,
      userId: req?.user?.id,
      username: req?.user?.username,
      action: "User data modified",
      resource: "USER",
      resourceId: targetUserId,
      resourceType: "user",
      status: "SUCCESS",
      changes,
    },
    req
  );
}

/**
 * Admin operation logging
 */
export async function logAdminAction(
  action: string,
  resource: string,
  resourceId: string,
  success: boolean,
  req?: Request,
  errorMessage?: string
): Promise<string> {
  return logAuditEvent(
    {
      eventType: AuditEventType.ADMIN_ACTION,
      severity: AuditSeverity.INFO,
      userId: req?.user?.id,
      username: req?.user?.username,
      userRole: req?.user?.role,
      action,
      resource,
      resourceId,
      status: success ? "SUCCESS" : "FAILURE",
      errorMessage: success ? undefined : errorMessage,
    },
    req
  );
}

/**
 * File operation logging
 */
export async function logFileOperation(
  operation: "UPLOAD" | "DELETE" | "ACCESS",
  fileName: string,
  fileSize?: number,
  success: boolean = true,
  req?: Request,
  errorMessage?: string
): Promise<string> {
  const eventTypeMap = {
    UPLOAD: AuditEventType.FILE_UPLOADED,
    DELETE: AuditEventType.FILE_DELETED,
    ACCESS: AuditEventType.FILE_ACCESSED,
  };

  return logAuditEvent(
    {
      eventType: eventTypeMap[operation],
      severity: AuditSeverity.INFO,
      userId: req?.user?.id,
      username: req?.user?.username,
      action: `File ${operation.toLowerCase()}`,
      resource: "FILE",
      resourceId: fileName,
      status: success ? "SUCCESS" : "FAILURE",
      errorMessage: success ? undefined : errorMessage,
      changes: fileSize ? { fileSize } : undefined,
    },
    req
  );
}

/**
 * Security event logging
 */
export async function logSecurityEvent(
  eventType: AuditEventType,
  description: string,
  severity: AuditSeverity,
  req?: Request,
  details?: Record<string, unknown>
): Promise<string> {
  return logAuditEvent(
    {
      eventType,
      severity,
      userId: req?.user?.id,
      username: req?.user?.username,
      action: description,
      resource: "SECURITY",
      status: "FAILURE",
      metadata: details,
    },
    req
  );
}

/**
 * Rate limit exceeded logging
 */
export async function logRateLimitExceeded(
  endpoint: string,
  req?: Request
): Promise<string> {
  return logAuditEvent(
    {
      eventType: AuditEventType.RATE_LIMIT_EXCEEDED,
      severity: AuditSeverity.WARNING,
      userId: req?.user?.id,
      username: req?.user?.username,
      action: "Rate limit exceeded",
      resource: "API",
      resourceId: endpoint,
      status: "FAILURE",
      statusCode: 429,
    },
    req
  );
}

/**
 * CSRF token validation failure logging
 */
export async function logCSRFTokenInvalid(req?: Request): Promise<string> {
  return logAuditEvent(
    {
      eventType: AuditEventType.CSRF_TOKEN_INVALID,
      severity: AuditSeverity.WARNING,
      userId: req?.user?.id,
      username: req?.user?.username,
      action: "CSRF token validation failed",
      resource: "SECURITY",
      status: "FAILURE",
    },
    req
  );
}
