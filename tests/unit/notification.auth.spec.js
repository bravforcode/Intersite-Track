/**
 * Notification Authorization Tests
 *
 * Uses an in-memory store instead of live Firestore so the tests are fully
 * isolated from external services (and don't consume Firestore quota).
 *
 * The real notification controller logic is tested via createNotificationHandlers()
 * (dependency injection) — the authorization rules are exercised exactly as in
 * production, but with an in-memory query layer wired up here.
 */

import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";
import request from "supertest";
import { createTestAppFactory } from "../setup/app.js";

// ─── In-memory notification store ────────────────────────────────────────────
const notificationStore = new Map();
let _idSeed = 0;

function addNotification(data) {
  const id = `mock-notif-${++_idSeed}`;
  notificationStore.set(id, { id, ...data });
  return id;
}

// Injected query implementations (no Firestore required)
const mockQueries = {
  getNotificationsByUser: async (userId) =>
    Array.from(notificationStore.values())
      .filter((n) => n.user_id === userId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 50),

  getNotificationById: async (id) => {
    const n = notificationStore.get(id);
    if (!n) {
      const err = new Error(`Notification not found: ${id}`);
      err.statusCode = 404;
      throw err;
    }
    return n;
  },

  getUnreadCount: async (userId) =>
    Array.from(notificationStore.values()).filter(
      (n) => n.user_id === userId && n.is_read === 0
    ).length,

  markNotificationRead: async (id) => {
    const n = notificationStore.get(id);
    if (n) notificationStore.set(id, { ...n, is_read: 1 });
  },

  markAllNotificationsRead: async (userId) => {
    for (const [id, n] of notificationStore.entries()) {
      if (n.user_id === userId && n.is_read === 0) {
        notificationStore.set(id, { ...n, is_read: 1 });
      }
    }
  },
};

// ─── Test constants ───────────────────────────────────────────────────────────
const testUserId1 = "test-user-auth-1";
const testUserId2 = "test-user-auth-2";
const testAdminId = "test-admin-auth-1";

const token1 = "test-token-1";
const token2 = "test-token-2";
const adminToken = "test-admin-token";

let testNotificationId1;
let testNotificationId2;

// ─── Tests ────────────────────────────────────────────────────────────────────
describe("Notification Authorization", () => {
  let appFactory;
  let app;

  before(() => {
    // Build the app with injected in-memory queries (no Firestore connection)
    appFactory = createTestAppFactory({ notificationQueries: mockQueries });
    app = appFactory.app;

    appFactory.testUsers.set(token1, {
      id: testUserId1,
      userId: testUserId1,
      authId: testUserId1,
      email: `${testUserId1}@test.com`,
      username: testUserId1,
      role: "staff",
      first_name: "Test",
      last_name: "User",
      department_id: null,
      position: null,
      created_at: new Date().toISOString(),
    });

    appFactory.testUsers.set(token2, {
      id: testUserId2,
      userId: testUserId2,
      authId: testUserId2,
      email: `${testUserId2}@test.com`,
      username: testUserId2,
      role: "staff",
      first_name: "Test",
      last_name: "User",
      department_id: null,
      position: null,
      created_at: new Date().toISOString(),
    });

    appFactory.testUsers.set(adminToken, {
      id: testAdminId,
      userId: testAdminId,
      authId: testAdminId,
      email: `${testAdminId}@test.com`,
      username: testAdminId,
      role: "admin",
      first_name: "Test",
      last_name: "Admin",
      department_id: null,
      position: null,
      created_at: new Date().toISOString(),
    });

    // Seed in-memory store (no Firestore)
    testNotificationId1 = addNotification({
      user_id: testUserId1,
      title: "Test Notification 1",
      message: "Message 1",
      type: "test",
      reference_id: null,
      is_read: 0,
      created_at: new Date().toISOString(),
    });

    testNotificationId2 = addNotification({
      user_id: testUserId2,
      title: "Test Notification 2",
      message: "Message 2",
      type: "test",
      reference_id: null,
      is_read: 0,
      created_at: new Date().toISOString(),
    });
  });

  after(() => {
    notificationStore.delete(testNotificationId1);
    notificationStore.delete(testNotificationId2);
  });

  describe("GET /api/notifications/:userId", () => {
    it("should allow user to GET own notifications (200)", async () => {
      const res = await request(app)
        .get(`/api/notifications/${testUserId1}`)
        .set("Authorization", `Bearer ${token1}`)
        .expect(200);

      assert.ok(Array.isArray(res.body), "Response should be an array");
      const ownNotification = res.body.find(
        (n) => n.id === testNotificationId1
      );
      assert.ok(ownNotification, "User should see their own notification");
      assert.strictEqual(ownNotification.user_id, testUserId1);
    });

    it("should deny user GET other user's notifications (403)", async () => {
      const res = await request(app)
        .get(`/api/notifications/${testUserId2}`)
        .set("Authorization", `Bearer ${token1}`)
        .expect(403);

      assert.deepStrictEqual(res.body, { error: "Forbidden" });
    });

    it("should allow admin GET any user's notifications (200)", async () => {
      const res = await request(app)
        .get(`/api/notifications/${testUserId2}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      assert.ok(Array.isArray(res.body), "Response should be an array");
    });
  });

  describe("PATCH /api/notifications/:id/read", () => {
    it("should allow user to PATCH own notification (200)", async () => {
      const res = await request(app)
        .patch(`/api/notifications/${testNotificationId1}/read`)
        .set("Authorization", `Bearer ${token1}`)
        .expect(200);

      assert.deepStrictEqual(res.body, { success: true });
      assert.strictEqual(
        notificationStore.get(testNotificationId1).is_read,
        1,
        "Notification should be marked as read"
      );
    });

    it("should deny user PATCH other user's notification (403)", async () => {
      // Ensure testNotificationId2 starts as unread for this check
      const n2 = notificationStore.get(testNotificationId2);
      notificationStore.set(testNotificationId2, { ...n2, is_read: 0 });

      const res = await request(app)
        .patch(`/api/notifications/${testNotificationId2}/read`)
        .set("Authorization", `Bearer ${token1}`)
        .expect(403);

      assert.deepStrictEqual(res.body, { error: "Forbidden" });
      assert.strictEqual(
        notificationStore.get(testNotificationId2).is_read,
        0,
        "Notification should NOT be marked as read"
      );
    });

    it("should allow admin PATCH any notification (200)", async () => {
      const res = await request(app)
        .patch(`/api/notifications/${testNotificationId2}/read`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      assert.deepStrictEqual(res.body, { success: true });
      assert.strictEqual(
        notificationStore.get(testNotificationId2).is_read,
        1,
        "Notification should be marked as read"
      );
    });
  });
});
