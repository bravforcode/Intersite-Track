/**
 * API Validation Schemas - Centralized contract between frontend and backend
 * Installed: npm install zod ✓
 */

import { z } from "zod";

/**
 * Zod validation schemas for all API endpoints
 * Ensures frontend-backend contract consistency and validates all inputs
 */

/**
 * ============================================================================
 * AUTHENTICATION SCHEMAS
 * ============================================================================
 */

const PasswordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Must contain uppercase letter")
  .regex(/[a-z]/, "Must contain lowercase letter")
  .regex(/[0-9]/, "Must contain number");

// Sign Up validation
export const SignUpSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: PasswordSchema,
});

export const LoginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

export const ProfileUpdateSchema = z.object({
  username: z.string().max(50).optional(),
  first_name: z.string().max(100).optional(),
  last_name: z.string().max(100).optional(),
  position: z.string().max(100).optional(),
  line_user_id: z.string().nullable().optional(),
});

export const PasswordChangeSchema = z.object({
  current_password: z.string().min(1, "Current password is required"),
  new_password: PasswordSchema,
});

export const CreateUserSchema = z.object({
  email: z.string().email("Invalid email format"),
  username: z.string().min(1, "Username is required").max(50),
  password: PasswordSchema,
  first_name: z.string().min(1, "First name is required").max(100),
  last_name: z.string().min(1, "Last name is required").max(100),
  role: z.enum(["admin", "staff"]).optional(),
  department_id: z.string().nullable().optional(),
  position: z.string().max(100).nullable().optional(),
  line_user_id: z.string().nullable().optional(),
});

export const UpdateUserSchema = z.object({
  username: z.string().min(1, "Username is required").max(50),
  first_name: z.string().min(1, "First name is required").max(100),
  last_name: z.string().min(1, "Last name is required").max(100),
  role: z.enum(["admin", "staff"]),
  department_id: z.string().nullable().optional(),
  position: z.string().max(100).nullable().optional(),
  line_user_id: z.string().nullable().optional(),
});

/**
 * ============================================================================
 * TASK SCHEMAS
 * ============================================================================
 */

export const CreateTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().max(5000).optional(),
  project_id: z.string().optional(),
  task_type_id: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  due_date: z.string().datetime().optional(),
  assignments: z.array(z.string()).optional(),
});

export const UpdateTaskSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  due_date: z.string().datetime().nullable().optional(),
  assignments: z.array(z.string()).optional(),
});

/**
 * ============================================================================
 * TIME ENTRY SCHEMAS
 * ============================================================================
 */

export const StartTimerSchema = z.object({
  description: z.string().max(500).optional(),
});

export const LogManualEntrySchema = z.object({
  duration_minutes: z.number().int().positive("Duration must be positive"),
  description: z.string().max(500).optional(),
  started_at: z.string().datetime().optional(),
});

/**
 * ============================================================================
 * APPROVAL SCHEMAS
 * ============================================================================
 */

export const CreateApprovalSchema = z.object({
  task_id: z.string().min(1, "Task ID is required"),
  approver_ids: z.array(z.string()).min(1, "At least one approver is required"),
  message: z.string().max(500).optional(),
  due_date: z.string().datetime().optional(),
});

export const ApproveTaskSchema = z.object({
  approval_id: z.string().min(1, "Approval ID is required"),
  notes: z.string().max(500).optional(),
});

export const RejectTaskSchema = z.object({
  approval_id: z.string().min(1, "Approval ID is required"),
  reason: z.string().min(1, "Reason is required").max(500),
});

/**
 * ============================================================================
 * API RESPONSE SCHEMAS
 * ============================================================================
 */

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: Record<string, string>;
}

export interface ApiListResponse<T> {
  success: true;
  data: T[];
  pagination?: {
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  };
}

/**
 * ============================================================================
 * TYPE INFERENCE FOR FORM VALIDATION
 * ============================================================================
 */

// Authentication
export type SignUpInput = z.infer<typeof SignUpSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type ProfileUpdateInput = z.infer<typeof ProfileUpdateSchema>;
export type PasswordChangeInput = z.infer<typeof PasswordChangeSchema>;
export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;

// Tasks
export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;

// Time Entries
export type StartTimerInput = z.infer<typeof StartTimerSchema>;
export type LogManualEntryInput = z.infer<typeof LogManualEntrySchema>;

// Approvals
export type CreateApprovalInput = z.infer<typeof CreateApprovalSchema>;
export type ApproveTaskInput = z.infer<typeof ApproveTaskSchema>;
export type RejectTaskInput = z.infer<typeof RejectTaskSchema>;
