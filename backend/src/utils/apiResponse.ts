/**
 * Standardized API Response Utilities
 * Ensures consistent response format across all endpoints
 */

import { Request, Response, NextFunction } from "express";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    public message: string,
    public details?: Record<string, string>
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Standardized Success Response
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode: number = 200,
  meta?: { pagination?: any }
): Response {
  return res.status(statusCode).json({
    success: true,
    data,
    ...(meta?.pagination && { pagination: meta.pagination }),
  });
}

/**
 * Standardized List Response with Pagination
 */
export function sendList<T>(
  res: Response,
  items: T[],
  pagination?: {
    total: number;
    limit: number;
    offset: number;
  },
  statusCode: number = 200
): Response {
  const response: any = {
    success: true,
    data: items,
  };

  if (pagination) {
    response.pagination = {
      total: pagination.total,
      limit: pagination.limit,
      offset: pagination.offset,
      has_more: pagination.offset + pagination.limit < pagination.total,
    };
  }

  return res.status(statusCode).json(response);
}

/**
 * Standardized Error Response
 * Supports ApiError, Error, or string with optional status, code, and details
 */
export function sendError(
  res: Response,
  error: ApiError | Error | string,
  statusCode?: number,
  code?: string,
  details?: Record<string, string>
): Response {
  if (error instanceof ApiError) {
    return res.status(error.status).json({
      success: false,
      error: error.message,
      code: error.code,
      ...(error.details && { details: error.details }),
    });
  }

  if (error instanceof Error) {
    // Avoid leaking internal error messages
    const status = statusCode || 500;
    return res.status(status).json({
      success: false,
      error: process.env.NODE_ENV === "production" ? "ข้อผิดพลาดในการประมวลผล" : error.message,
      code: code || "INTERNAL_ERROR",
      ...(details && { details }),
    });
  }

  return res.status(statusCode || 500).json({
    success: false,
    error: typeof error === "string" ? error : "ข้อผิดพลาดในการประมวลผล",
    code: code || "UNKNOWN_ERROR",
    ...(details && { details }),
  });
}

/**
 * Validation Error Factory
 */
export function validationError(
  details: Record<string, string>,
  message: string = "Validation failed"
): ApiError {
  return new ApiError(400, "VALIDATION_ERROR", message, details);
}

/**
 * Not Found Error Factory
 */
export function notFoundError(resource: string): ApiError {
  return new ApiError(404, "NOT_FOUND", `${resource} not found`);
}

/**
 * Unauthorized Error Factory
 */
export function unauthorizedError(message: string = "Unauthorized"): ApiError {
  return new ApiError(401, "UNAUTHORIZED", message);
}

/**
 * Forbidden Error Factory
 */
export function forbiddenError(message: string = "Forbidden"): ApiError {
  return new ApiError(403, "FORBIDDEN", message);
}

/**
 * Conflict Error Factory
 */
export function conflictError(message: string, code: string = "CONFLICT"): ApiError {
  return new ApiError(409, code, message);
}

/**
 * Error Handling Middleware
 * Use as last middleware: app.use(errorHandler);
 */
export function errorHandler(
  err: Error | ApiError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (process.env.NODE_ENV !== "production") {
    console.error("[API Error]", err);
  }

  if (err instanceof ApiError) {
    sendError(res, err);
    return;
  }

  // Default 500 error
  sendError(res, err, 500);
}

/**
 * Response interceptor middleware
 * Apply this after all routes to wrap responses
 */
export function responseInterceptor(req: Request, res: Response, next: NextFunction): void {
  // Override json to ensure consistent format for API responses
  const originalJson = res.json;

  // Override json to ensure consistent format for API responses
  res.json = function <T>(body: T): Response {
    // Only apply our format to /api routes that return objects
    if (req.path.startsWith("/api") && typeof body === "object" && body !== null) {
      const bodyObj = body as any;

      // If it doesn't have our standard format yet
      if (!("success" in bodyObj)) {
        // Don't wrap if it's an error or already wrapped
        if (res.statusCode >= 400) {
          // Error response - let error handler wrap it
          return originalJson.call(this, body);
        }
        // Wrap success response
        return originalJson.call(this, {
          success: true,
          data: body,
        });
      }
    }

    return originalJson.call(this, body);
  };

  next();
}
