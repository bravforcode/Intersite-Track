import { Request, Response, NextFunction } from "express";
import {
  logRateLimitExceeded,
  logCSRFTokenInvalid,
  logAuditEvent,
  AuditEventType,
  AuditSeverity,
} from "../utils/auditLogger.js";

/**
 * Middleware to log rate limit exceeded events
 * Integrates with express-rate-limit middleware
 * CWE-770: Allocation of Resources Without Limits or Throttling
 */
export function auditRateLimitMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Store original send function
  const originalSend = res.send;

  // Override send to capture 429 responses
  res.send = function (data: any) {
    if (res.statusCode === 429) {
      // Log rate limit exceeded asynchronously (don't block response)
      logRateLimitExceeded(req.path, req).catch((err) => {
        process.stderr.write(`[AUDIT] Failed to log rate limit: ${err}\n`);
      });
    }
    return originalSend.call(this, data);
  };

  next();
}

/**
 * Middleware to log CSRF validation failures
 * CWE-352: Cross-Site Request Forgery (CSRF)
 */
export function auditCSRFMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Store original send function
  const originalSend = res.send;

  // Override send to capture 403 Forbidden responses from CSRF validation
  res.send = function (data: any) {
    if (res.statusCode === 403 && typeof data === "string" && data.includes("CSRF")) {
      // Log CSRF failure asynchronously
      logCSRFTokenInvalid(req).catch((err) => {
        process.stderr.write(`[AUDIT] Failed to log CSRF failure: ${err}\n`);
      });
    }
    return originalSend.call(this, data);
  };

  next();
}

/**
 * Middleware to log API errors
 * CWE-537: Insertion of Sensitive Information in Rendered Web Page
 * CWE-778: Insufficient Logging of Errors
 */
export function auditErrorMiddleware(err: Error, req: Request, res: Response, next: NextFunction): void {
  const statusCode = res.statusCode || 500;
  const isServerError = statusCode >= 500;

  // Log server errors (5xx) but not client errors (4xx) except for auth/security ones
  if (isServerError || statusCode === 401 || statusCode === 403) {
    logAuditEvent(
      {
        eventType: AuditEventType.API_ERROR,
        severity: isServerError ? AuditSeverity.CRITICAL : AuditSeverity.WARNING,
        userId: req.user?.id,
        username: req.user?.username,
        action: `API error on ${req.method} ${req.path}`,
        resource: "API",
        resourceId: req.path,
        status: "FAILURE",
        statusCode,
        errorMessage: err.message,
      },
      req
    ).catch((auditErr) => {
      process.stderr.write(`[AUDIT] Failed to log error: ${auditErr}\n`);
    });
  }

  next(err);
}

/**
 * Middleware to audit authenticated API requests
 * Logs high-risk operations (POST, PUT, DELETE)
 * CWE-778: Insufficient Logging
 */
export function auditApiRequestMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Only audit write operations on authenticated users
  const isWriteOperation = ["POST", "PUT", "DELETE", "PATCH"].includes(req.method);
  const isAuthenticated = !!req.user?.id;

  if (isWriteOperation && isAuthenticated) {
    // Store metadata for later logging in response handler
    (req as any).auditStart = {
      method: req.method,
      path: req.path,
      userId: req.user?.id,
      username: req.user?.username,
    };
  }

  // Capture response to log after completion
  const originalSend = res.send;

  res.send = function (data: any) {
    if ((req as any).auditStart && res.statusCode < 400) {
      // Log successful write operations
      logAuditEvent(
        {
          eventType: AuditEventType.ADMIN_ACTION, // Generic for all operations
          severity: AuditSeverity.INFO,
          userId: req.user?.id,
          username: req.user?.username,
          userRole: req.user?.role,
          action: `${req.method} ${req.path}`,
          resource: "API",
          resourceId: req.path,
          status: "SUCCESS",
          statusCode: res.statusCode,
        },
        req
      ).catch((err) => {
        process.stderr.write(`[AUDIT] Failed to log API request: ${err}\n`);
      });
    }

    return originalSend.call(this, data);
  };

  next();
}
