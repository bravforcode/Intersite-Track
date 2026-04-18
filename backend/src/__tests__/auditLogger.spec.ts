import { describe, it, beforeEach, afterEach, expect, vi } from "vitest";
import {
  sanitizeAuditPayload,
  createAuditLog,
  logAuditEvent,
  logLoginAttempt,
  logLogout,
  logUserCreated,
  logUserUpdated,
  logAdminAction,
  logFileOperation,
  logSecurityEvent,
  logRateLimitExceeded,
  logCSRFTokenInvalid,
  AuditEventType,
  AuditSeverity,
} from "../src/utils/auditLogger.js";
import { db } from "../src/config/firebase-admin.js";
import type { Request } from "express";

// Mock Firebase
vi.mock("../src/config/firebase-admin.js", () => ({
  db: {
    collection: vi.fn(),
  },
}));

describe("Audit Logger", () => {
  let mockCollectionRef: any;
  let mockDocRef: any;

  beforeEach(() => {
    mockDocRef = { id: "audit-log-123" };
    mockCollectionRef = {
      add: vi.fn().mockResolvedValue(mockDocRef),
    };
    (db.collection as any).mockReturnValue(mockCollectionRef);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("sanitizeAuditPayload", () => {
    it("should redact password field", () => {
      const input = {
        username: "john",
        password: "secret123",
        email: "john@example.com",
      };

      const result = sanitizeAuditPayload(input);

      expect(result).toEqual({
        username: "john",
        password: "[REDACTED]",
        email: "john@example.com",
      });
    });

    it("should redact token field", () => {
      const input = {
        userId: "user123",
        token: "eyJhbGciOi...",
        data: "some-data",
      };

      const result = sanitizeAuditPayload(input);

      expect(result).toEqual({
        userId: "user123",
        token: "[REDACTED]",
        data: "some-data",
      });
    });

    it("should redact apiKey field", () => {
      const input = {
        service: "stripe",
        apiKey: "sk_live_123456",
        enabled: true,
      };

      const result = sanitizeAuditPayload(input);

      expect(result).toEqual({
        service: "stripe",
        apiKey: "[REDACTED]",
        enabled: true,
      });
    });

    it("should recursively sanitize nested objects", () => {
      const input = {
        user: {
          id: "user123",
          password: "secret",
          profile: {
            name: "John",
            secret: "hidden",
          },
        },
      };

      const result = sanitizeAuditPayload(input);

      expect(result).toEqual({
        user: {
          id: "user123",
          password: "[REDACTED]",
          profile: {
            name: "John",
            secret: "[REDACTED]",
          },
        },
      });
    });

    it("should handle arrays", () => {
      const input = [
        { id: 1, password: "secret1" },
        { id: 2, password: "secret2" },
      ];

      const result = sanitizeAuditPayload(input);

      expect(result).toEqual([
        { id: 1, password: "[REDACTED]" },
        { id: 2, password: "[REDACTED]" },
      ]);
    });

    it("should convert Date objects to ISO strings", () => {
      const input = {
        createdAt: new Date("2026-04-13T10:00:00Z"),
        username: "john",
      };

      const result = sanitizeAuditPayload(input);

      expect(result).toEqual({
        createdAt: "2026-04-13T10:00:00.000Z",
        username: "john",
      });
    });

    it("should handle null and undefined values", () => {
      expect(sanitizeAuditPayload(null)).toBeNull();
      expect(sanitizeAuditPayload(undefined)).toBeNull();
    });
  });

  describe("createAuditLog", () => {
    it("should create task audit log without sensitive data", async () => {
      const oldData = { status: "open", password: "secret" };
      const newData = { status: "closed", secret: "hidden" };

      await createAuditLog("task123", "user456", "UPDATE", oldData, newData);

      expect(mockCollectionRef.add).toHaveBeenCalledWith(
        expect.objectContaining({
          task_id: "task123",
          user_id: "user456",
          action: "UPDATE",
          old_data: { status: "open", password: "[REDACTED]" },
          new_data: { status: "closed", secret: "[REDACTED]" },
          created_at: expect.any(String),
        })
      );
    });

    it("should handle null data gracefully", async () => {
      await createAuditLog("task123", "user456", "CREATE", null, { status: "open" });

      expect(mockCollectionRef.add).toHaveBeenCalledWith(
        expect.objectContaining({
          task_id: "task123",
          old_data: null,
        })
      );
    });
  });

  describe("logAuditEvent", () => {
    it("should create comprehensive audit log entry", async () => {
      const mockReq = {
        ip: "192.168.1.1",
        socket: { remoteAddress: "192.168.1.1" },
        get: vi.fn((key) => (key === "user-agent" ? "Mozilla/5.0" : undefined)),
        user: {
          id: "user123",
          username: "john",
          role: "admin",
        },
      } as unknown as Request;

      const result = await logAuditEvent(
        {
          eventType: AuditEventType.USER_CREATED,
          severity: AuditSeverity.INFO,
          userId: "user123",
          username: "john",
          action: "User created",
          resource: "USER",
          resourceId: "newuser123",
          status: "SUCCESS",
        },
        mockReq
      );

      expect(result).toBe("audit-log-123");
      expect(mockCollectionRef.add).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: AuditEventType.USER_CREATED,
          severity: AuditSeverity.INFO,
          action: "User created",
          resource: "USER",
          status: "SUCCESS",
          ipAddress: "192.168.1.1",
          userAgent: "Mozilla/5.0",
        })
      );
    });

    it("should handle missing request object", async () => {
      const result = await logAuditEvent({
        eventType: AuditEventType.LOGIN_SUCCESS,
        severity: AuditSeverity.INFO,
        username: "john",
        action: "Login",
        resource: "AUTH",
        status: "SUCCESS",
      });

      expect(result).toBe("audit-log-123");
      expect(mockCollectionRef.add).toHaveBeenCalled();
    });

    it("should return ERROR when audit log fails", async () => {
      mockCollectionRef.add.mockRejectedValueOnce(new Error("Firestore error"));

      const result = await logAuditEvent({
        eventType: AuditEventType.API_ERROR,
        severity: AuditSeverity.CRITICAL,
        action: "Error occurred",
        resource: "API",
        status: "FAILURE",
      });

      expect(result).toBe("ERROR");
    });
  });

  describe("logLoginAttempt", () => {
    it("should log successful login", async () => {
      const mockReq = {
        ip: "192.168.1.1",
        socket: { remoteAddress: "192.168.1.1" },
        get: vi.fn(),
      } as unknown as Request;

      await logLoginAttempt("john", true, mockReq);

      expect(mockCollectionRef.add).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: AuditEventType.LOGIN_SUCCESS,
          severity: AuditSeverity.INFO,
          username: "john",
          status: "SUCCESS",
        })
      );
    });

    it("should log failed login with error message", async () => {
      await logLoginAttempt("john", false, undefined, "Invalid password");

      expect(mockCollectionRef.add).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: AuditEventType.LOGIN_FAILED,
          severity: AuditSeverity.WARNING,
          username: "john",
          status: "FAILURE",
          errorMessage: "Invalid password",
        })
      );
    });
  });

  describe("logUserCreated", () => {
    it("should log user creation", async () => {
      const mockReq = {
        ip: "192.168.1.1",
        socket: { remoteAddress: "192.168.1.1" },
        get: vi.fn(),
        user: { id: "admin123", username: "admin" },
      } as unknown as Request;

      await logUserCreated("newuser123", "john", "staff", mockReq);

      expect(mockCollectionRef.add).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: AuditEventType.USER_CREATED,
          action: "User account created",
          resourceId: "newuser123",
          status: "SUCCESS",
          changes: { created_user: "john", role: "staff" },
        })
      );
    });
  });

  describe("logUserUpdated", () => {
    it("should log user update with changes", async () => {
      const changes = { role: "manager", department: "sales" };
      const mockReq = {
        ip: "192.168.1.1",
        socket: { remoteAddress: "192.168.1.1" },
        get: vi.fn(),
        user: { id: "admin123", username: "admin" },
      } as unknown as Request;

      await logUserUpdated("user123", "john", changes, mockReq);

      expect(mockCollectionRef.add).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: AuditEventType.USER_UPDATED,
          action: "User data modified",
          changes,
          status: "SUCCESS",
        })
      );
    });
  });

  describe("logAdminAction", () => {
    it("should log successful admin action", async () => {
      const mockReq = {
        ip: "192.168.1.1",
        socket: { remoteAddress: "192.168.1.1" },
        get: vi.fn(),
        user: { id: "admin123", username: "admin", role: "admin" },
      } as unknown as Request;

      await logAdminAction("DELETE_TASK", "TASK", "task123", true, mockReq);

      expect(mockCollectionRef.add).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: AuditEventType.ADMIN_ACTION,
          action: "DELETE_TASK",
          resource: "TASK",
          resourceId: "task123",
          status: "SUCCESS",
        })
      );
    });

    it("should log failed admin action with error", async () => {
      await logAdminAction("DELETE_TASK", "TASK", "task123", false, undefined, "Permission denied");

      expect(mockCollectionRef.add).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "FAILURE",
          errorMessage: "Permission denied",
        })
      );
    });
  });

  describe("logFileOperation", () => {
    it("should log file upload", async () => {
      const mockReq = {
        ip: "192.168.1.1",
        socket: { remoteAddress: "192.168.1.1" },
        get: vi.fn(),
        user: { id: "user123", username: "john" },
      } as unknown as Request;

      await logFileOperation("UPLOAD", "document.pdf", 1024 * 500, true, mockReq);

      expect(mockCollectionRef.add).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: AuditEventType.FILE_UPLOADED,
          action: "File upload",
          resource: "FILE",
          resourceId: "document.pdf",
          status: "SUCCESS",
          changes: { fileSize: 512000 },
        })
      );
    });

    it("should log file deletion", async () => {
      await logFileOperation("DELETE", "oldfile.txt", undefined, true);

      expect(mockCollectionRef.add).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: AuditEventType.FILE_DELETED,
          action: "File delete",
        })
      );
    });
  });

  describe("logRateLimitExceeded", () => {
    it("should log rate limit exceeded event", async () => {
      const mockReq = {
        ip: "192.168.1.1",
        socket: { remoteAddress: "192.168.1.1" },
        get: vi.fn(),
        user: { id: "user123", username: "attacker" },
      } as unknown as Request;

      await logRateLimitExceeded("/api/tasks", mockReq);

      expect(mockCollectionRef.add).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: AuditEventType.RATE_LIMIT_EXCEEDED,
          severity: AuditSeverity.WARNING,
          statusCode: 429,
          status: "FAILURE",
        })
      );
    });
  });

  describe("logCSRFTokenInvalid", () => {
    it("should log CSRF token validation failure", async () => {
      const mockReq = {
        ip: "192.168.1.1",
        socket: { remoteAddress: "192.168.1.1" },
        get: vi.fn(),
      } as unknown as Request;

      await logCSRFTokenInvalid(mockReq);

      expect(mockCollectionRef.add).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: AuditEventType.CSRF_TOKEN_INVALID,
          severity: AuditSeverity.WARNING,
          action: "CSRF token validation failed",
          status: "FAILURE",
        })
      );
    });
  });

  describe("logSecurityEvent", () => {
    it("should log suspicious activity", async () => {
      const mockReq = {
        ip: "192.168.1.1",
        socket: { remoteAddress: "192.168.1.1" },
        get: vi.fn(),
      } as unknown as Request;

      await logSecurityEvent(
        AuditEventType.SUSPICIOUS_ACTIVITY,
        "Multiple failed auth attempts",
        AuditSeverity.CRITICAL,
        mockReq,
        { attempts: 10, timeWindow: "5min" }
      );

      expect(mockCollectionRef.add).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: AuditEventType.SUSPICIOUS_ACTIVITY,
          severity: AuditSeverity.CRITICAL,
          action: "Multiple failed auth attempts",
          metadata: { attempts: 10, timeWindow: "5min" },
        })
      );
    });
  });
});
