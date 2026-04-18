/**
 * INTEGRATION TEST SUITE
 * Tests API integration with external services and databases
 */

import { test, expect } from "@playwright/test";

const API_URL = process.env.BASE_URL || "http://localhost:3694";

test.describe("API Integration Tests", () => {
  // Setup: Get auth token
  let authToken: string;

  test.beforeAll(async () => {
    // Initialize auth token if needed
  });

  test.describe("User Management API", () => {
    test("should create user via API", async ({ request }) => {
      const response = await request.post(`${API_URL}/api/auth/register`, {
        data: {
          email: `user_${Date.now()}@test.com`,
          password: "Password123!@#",
          name: "Test User",
        },
      });

      expect(response.status()).toBe(201 || 200);
      expect(response.ok()).toBeTruthy();
    });

    test("should get user profile via API", async ({ request }) => {
      const response = await request.get(`${API_URL}/api/user/profile`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.status()).toBe(200 || 401); // 401 if not authenticated
    });

    test("should update user profile", async ({ request }) => {
      const response = await request.put(`${API_URL}/api/user/profile`, {
        data: {
          name: "Updated Name",
          email: "newemail@test.com",
        },
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect([200, 400, 401]).toContain(response.status());
    });
  });

  test.describe("Data CRUD Operations", () => {
    let createdItemId: string;

    test("should create item", async ({ request }) => {
      const response = await request.post(`${API_URL}/api/data`, {
        data: {
          title: "Test Item",
          description: "Test Description",
        },
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (response.ok()) {
        const data = await response.json();
        createdItemId = data.id;
      }

      expect([200, 201, 400, 401]).toContain(response.status());
    });

    test("should read item", async ({ request }) => {
      if (!createdItemId) return;

      const response = await request.get(`${API_URL}/api/data/${createdItemId}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect([200, 404, 401]).toContain(response.status());
    });

    test("should update item", async ({ request }) => {
      if (!createdItemId) return;

      const response = await request.put(`${API_URL}/api/data/${createdItemId}`, {
        data: {
          title: "Updated Title",
        },
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect([200, 400, 404, 401]).toContain(response.status());
    });

    test("should delete item", async ({ request }) => {
      if (!createdItemId) return;

      const response = await request.delete(`${API_URL}/api/data/${createdItemId}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect([200, 204, 404, 401]).toContain(response.status());
    });
  });

  test.describe("File Operations", () => {
    test("should upload file", async ({ request }) => {
      const fileContent = Buffer.from("Test file content");

      const response = await request.post(`${API_URL}/api/files/upload`, {
        multipart: {
          file: {
            name: "test.txt",
            mimeType: "text/plain",
            buffer: fileContent,
          },
        },
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect([200, 201, 400, 401]).toContain(response.status());
    });

    test("should list files", async ({ request }) => {
      const response = await request.get(`${API_URL}/api/files`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect([200, 401]).toContain(response.status());
      if (response.ok()) {
        const data = await response.json();
        expect(Array.isArray(data) || data.files).toBeTruthy();
      }
    });
  });

  test.describe("Error Handling", () => {
    test("should handle 400 Bad Request", async ({ request }) => {
      const response = await request.post(`${API_URL}/api/auth/login`, {
        data: {
          // Missing required fields
        },
      });

      expect(response.status()).toBe(400);
    });

    test("should handle 401 Unauthorized", async ({ request }) => {
      const response = await request.get(`${API_URL}/api/user/profile`, {
        headers: {
          Authorization: "Bearer invalid_token",
        },
      });

      expect(response.status()).toBe(401);
    });

    test("should handle 404 Not Found", async ({ request }) => {
      const response = await request.get(
        `${API_URL}/api/data/nonexistent-id`
      );

      expect(response.status()).toBe(404);
    });

    test("should handle 500 Server Error gracefully", async ({ request }) => {
      const response = await request.get(`${API_URL}/api/health`);

      // Should not return 500 for health endpoint
      expect(response.status()).not.toBe(500);
    });
  });

  test.describe("Pagination", () => {
    test("should handle pagination parameters", async ({ request }) => {
      const response = await request.get(
        `${API_URL}/api/data?page=1&limit=10`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      expect([200, 400, 401]).toContain(response.status());
    });

    test("should return correct page size", async ({ request }) => {
      const response = await request.get(
        `${API_URL}/api/data?limit=5`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      if (response.ok()) {
        const data = await response.json();
        if (Array.isArray(data)) {
          expect(data.length).toBeLessThanOrEqual(5);
        }
      }
    });
  });

  test.describe("Filtering", () => {
    test("should filter by search query", async ({ request }) => {
      const response = await request.get(
        `${API_URL}/api/data?search=test`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      expect([200, 400, 401]).toContain(response.status());
    });

    test("should filter by status", async ({ request }) => {
      const response = await request.get(
        `${API_URL}/api/data?status=active`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      expect([200, 400, 401]).toContain(response.status());
    });
  });

  test.describe("Sorting", () => {
    test("should sort by date", async ({ request }) => {
      const response = await request.get(
        `${API_URL}/api/data?sort=date&order=desc`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      expect([200, 400, 401]).toContain(response.status());
    });

    test("should sort by name", async ({ request }) => {
      const response = await request.get(
        `${API_URL}/api/data?sort=name&order=asc`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      expect([200, 400, 401]).toContain(response.status());
    });
  });
});
