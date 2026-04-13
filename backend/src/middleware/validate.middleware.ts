/**
 * Validation Middleware - Centralized request body validation using Zod schemas
 * Catches validation errors early and returns standardized error responses
 */

import { Request, Response, NextFunction } from "express";
import { z, ZodError } from "zod";
import { sendError } from "../utils/apiResponse.js";

/**
 * Request validation middleware factory
 * Validates req.body against provided Zod schema
 * Returns 400 with validation errors if invalid
 */
export function validate<T extends z.ZodSchema>(schema: T) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Parse and validate request body
      const validated = await schema.parseAsync(req.body);

      // Attach validated data to request for downstream handlers
      (req as any).validatedBody = validated;

      next();
    } catch (err) {
      if (err instanceof ZodError) {
        // Format Zod validation errors
        const fieldErrors: Record<string, string> = {};
        err.issues.forEach((issue: any) => {
          const path = issue.path.join(".");
          fieldErrors[path] = issue.message;
        });

        sendError(
          res,
          new Error("Validation failed"),
          400,
          "VALIDATION_ERROR",
          fieldErrors
        );
        return;
      }

      next(err);
    }
  };
}

/**
 * Middleware to attach validation schemas dynamically to request
 * Usage: Use with route-level validate() middleware
 */
export function getValidatedBody<T>(req: Request): T {
  return (req as any).validatedBody as T;
}

/**
 * Type-safe validation helper for query parameters
 */
export function validateQuery<T extends z.ZodSchema>(schema: T) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validated = await schema.parseAsync(req.query);
      (req as any).validatedQuery = validated;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const fieldErrors: Record<string, string> = {};
        err.issues.forEach((issue: any) => {
          const path = issue.path.join(".");
          fieldErrors[path] = issue.message;
        });

        sendError(
          res,
          new Error("Query validation failed"),
          400,
          "QUERY_VALIDATION_ERROR",
          fieldErrors
        );
        return;
      }

      next(err);
    }
  };
}

/**
 * Get validated query parameters
 */
export function getValidatedQuery<T>(req: Request): T {
  return (req as any).validatedQuery as T;
}
