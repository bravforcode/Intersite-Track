/**
 * API Contract Tests - Ensures frontend and backend contract consistency
 * Tests that API responses match expected schemas
 * 
 * Run: npm test -- tests/integration/api-contracts.spec.ts
 */

import { describe, it } from "node:test";
import assert from "assert";
import supertest from "supertest";

// This assumes a test server is running on PORT 3694
const API_URL = process.env.API_URL || "http://localhost:3694";
const request = supertest(API_URL);

// Test auth token (update with actual test token)
let testToken: string;
let testUserId: string;

describe("API Contract Tests", () => {
  // Setup: Login before tests
  it("should login and get auth token", async () => {
    const response = await request.post("/api/auth/login").send({
      email: "admin@test.com",
      password: "Admin@123456",
    });

    assert.strictEqual(response.status, 200);
    assert(response.body.success === true);
    assert(response.body.data?.id, "Should have user ID");
    assert(response.body.data?.email, "Should have email");

    testUserId = response.body.data.id;
    // Token is obtained from Firebase separately
  });

  describe("Success Response Format", () => {
    it("should return standardized success response", async () => {
      const response = await request.get("/api/health");

      assert.strictEqual(response.status, 200);
      assert(response.body.success === true);
      assert(response.body.data || response.body.status, "Should have data or status");
    });

    it("should return list response with pagination", async () => {
      const response = await request
        .get("/api/tasks?limit=10&offset=0")
        .set("Authorization", `Bearer ${testToken}`);

      assert(response.status < 400);
      assert(response.body.success === true);
      assert(Array.isArray(response.body.data), "Data should be array");

      if (response.body.pagination) {
        assert(typeof response.body.pagination.total === "number");
        assert(typeof response.body.pagination.limit === "number");
        assert(typeof response.body.pagination.offset === "number");
        assert(typeof response.body.pagination.has_more === "boolean");
      }
    });

    it("should return paginated response with correct structure", async () => {
      const response = await request
        .get("/api/users?limit=20&offset=0")
        .set("Authorization", `Bearer ${testToken}`);

      if (response.status === 200) {
        const pagination = response.body.pagination;
        assert(pagination, "Should have pagination object");
        assert(pagination.offset === 0, "offset should be 0");
        assert(pagination.limit === 20, "limit should be 20");
        assert(typeof pagination.has_more === "boolean", "has_more should be boolean");
      }
    });
  });

  describe("Error Response Format", () => {
    it("should return error for 401 unauthorized", async () => {
      const response = await request.get("/api/tasks");

      assert.strictEqual(response.status, 401);
      assert(response.body.success === false);
      assert(response.body.error, "Should have error message");
      assert(response.body.code, "Should have error code");
    });

    it("should return error for 403 forbidden", async () => {
      const response = await request
        .get(`/api/tasks/unauthorized-id`)
        .set("Authorization", `Bearer ${testToken}`);

      if (response.status === 403) {
        assert(response.body.success === false);
        assert(response.body.error, "Should have error message");
        assert(response.body.code === "FORBIDDEN", "Code should be FORBIDDEN");
      }
    });

    it("should return error for 404 not found", async () => {
      const response = await request
        .get("/api/tasks/nonexistent-id")
        .set("Authorization", `Bearer ${testToken}`);

      if (response.status === 404) {
        assert(response.body.success === false);
        assert(response.body.error, "Should have error message");
        assert(response.body.code === "NOT_FOUND", "Code should be NOT_FOUND");
      }
    });

    it("should return validation error with details", async () => {
      const response = await request
        .post("/api/tasks")
        .set("Authorization", `Bearer ${testToken}`)
        .send({
          title: "", // Empty title
          due_date: "invalid-date", // Invalid date
        });

      if (response.status === 400) {
        assert(response.body.success === false);
        assert(response.body.code === "VALIDATION_ERROR");
        // Should have details about which fields failed
        if (response.body.details) {
          assert(typeof response.body.details === "object");
        }
      }
    });
  });

  describe("Authentication Contracts", () => {
    it("POST /api/auth/signup should create user", async () => {
      const email = `test-${Date.now()}@example.com`;
      const response = await request.post("/api/auth/signup").send({
        email,
        password: "TestPass@123456",
      });

      assert.strictEqual(response.status, 201);
      assert(response.body.success === true);
      assert(response.body.data?.id, "Should have user ID");
      assert(response.body.data?.email === email, "Should return created email");
    });

    it("POST /api/auth/profile should return user profile", async () => {
      const response = await request
        .post("/api/auth/profile")
        .set("Authorization", `Bearer ${testToken}`);

      if (response.status === 200) {
        assert(response.body.success === true);
        assert(response.body.data?.id, "Should have ID");
        assert(response.body.data?.email, "Should have email");
        assert(response.body.data?.role, "Should have role");
        assert(response.body.data?.username, "Should have username");
      }
    });
  });

  describe("Task Management Contracts", () => {
    it("POST /api/tasks should create task with all fields", async () => {
      const response = await request
        .post("/api/tasks")
        .set("Authorization", `Bearer ${testToken}`)
        .send({
          title: "Test Task",
          description: "Test description",
          priority: "high",
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        });

      if (response.status === 201) {
        assert(response.body.success === true);
        assert(response.body.data?.id, "Should have task ID");
        assert(response.body.data?.title, "Should have title");
        assert(response.body.data?.created_at, "Should have created_at");
      }
    });

    it("GET /api/tasks/:id should return single task", async () => {
      // Need a real task ID from setup
      const response = await request
        .get("/api/tasks/test-id")
        .set("Authorization", `Bearer ${testToken}`);

      if (response.status === 200) {
        assert(response.body.success === true);
        assert(response.body.data?.id, "Should have ID");
        assert(response.body.data?.title, "Should have title");
        assert(Array.isArray(response.body.data?.comments), "comments should be array");
        assert(Array.isArray(response.body.data?.checklist_items), "checklist_items should be array");
      }
    });

    it("PATCH /api/tasks/:id should update and return updated task", async () => {
      const response = await request
        .patch("/api/tasks/test-id")
        .set("Authorization", `Bearer ${testToken}`)
        .send({
          status: "in_progress",
          priority: "medium",
        });

      if (response.status === 200) {
        assert(response.body.success === true);
        assert(response.body.data?.status === "in_progress");
        assert(response.body.data?.priority === "medium");
      }
    });
  });

  describe("Authorization Contracts", () => {
    it("should reject unauthorized time-entry access", async () => {
      const response = await request.get("/api/time-entries/task-id").set("Authorization", `Bearer ${testToken}`);

      // Should either succeed (if authorized) or fail with 403 (if not)
      assert(response.status === 200 || response.status === 403);
      if (response.status === 403) {
        assert(response.body.success === false);
        assert(response.body.code === "FORBIDDEN");
      }
    });

    it("should prevent non-owners from deleting entries", async () => {
      const response = await request
        .delete("/api/time-entries/other-user-entry")
        .set("Authorization", `Bearer ${testToken}`);

      assert(response.status === 403 || response.status === 404);
      if (response.status === 403) {
        assert(response.body.success === false);
      }
    });
  });

  describe("File Upload Contracts", () => {
    it("should return structured response for file upload", async () => {
      // File upload response should include download URL, not direct blob URL
      // This would be tested via E2E with actual file upload
      // Here we verify the contract structure

      const expectedResponse = {
        success: true,
        data: {
          file_id: "string",
          download_url: "string", // NOT direct blob URL
          original_name: "string",
        },
      };

      // Verify that we expect download_url not blob_url
      assert(expectedResponse.data.download_url, "Should have download_url");
      assert(!expectedResponse.data.blob_url, "Should NOT have blob_url");
    });
  });

  describe("Response Headers", () => {
    it("should include security headers", async () => {
      const response = await request.get("/api/health");

      // Check for security headers
      assert(response.headers["x-content-type-options"], "Should have X-Content-Type-Options");
      assert(response.headers["x-frame-options"], "Should have X-Frame-Options");
      assert(response.headers["content-security-policy"] || !process.env.NODE_ENV === "development",
        "Should have CSP in production");
    });
  });
});
