import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger.js";

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

/** 404 handler - must be registered after all routes */
export function notFound(req: Request, res: Response): void {
  logger.warn(`404 Not Found: ${req.method} ${req.path}`);
  res.status(404).json({ error: `ไม่พบ endpoint: ${req.method} ${req.path}` });
}

/** Centralized error handler - must be registered last */
export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : "เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่อีกครั้ง";

  try {
    logger.error(err.message, {
      method: req.method,
      path: req.path,
      statusCode,
      stack: err.stack,
      user: req.user?.id
    });
  } catch {
    // Ignore logging errors (e.g. read-only filesystem on Vercel)
    process.stderr.write(`[ERROR] ${err.message}\n`);
  }

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === "development" && { detail: err.message }),
  });
}

/** Create an operational error with a status code */
export function createError(message: string, statusCode: number): AppError {
  const err: AppError = new Error(message);
  err.statusCode = statusCode;
  err.isOperational = true;
  return err;
}
