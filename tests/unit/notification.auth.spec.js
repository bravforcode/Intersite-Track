import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";
import request from "supertest";
import { db } from "../../server/config/firebase-admin.js";
import { createTestAppFactory } from "../setup/app.js";

// Test user IDs
const testUserId1 = "test-user-auth-1";
const testUserId2 = "test-user-auth-2";
const testAdminId = "test-admin-auth-1";

// Tokens
const token1 = "test-token-1"; // for testUserId1
const token2 = "test-token-2"; // for testUserId2
const adminToken = "test-admin-token"; // for admin user

// Test notification IDs (will be set after creation)
let testNotificationId1;
let testNotificationId2;

describe("Notification Authorization", () => {
  let appFactory;
  let app;

  before(async () => {
    // Create test app factory with mock auth
    appFactory = createTestAppFactory();
    app = appFactory.app;

    // Register test users
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

    // Create test notifications
    const ref1 = await db.collection("notifications").add({
      user_id: testUserId1,
      title: "Test Notification 1",
      message: "Message 1",
      type: "test",
      reference_id: null,
      is_read: 0,
      created_at: new Date().toISOString(),
    });
    testNotificationId1 = ref1.id;

    const ref2 = await db.collection("notifications").add({
      user_id: testUserId2,
      title: "Test Notification 2",
      message: "Message 2",
      type: "test",
      reference_id: null,
      is_read: 0,
      created_at: new Date().toISOString(),
    });
    testNotificationId2 = ref2.id;
  });

  after(async () => {
    // Clean up test notifications
    await db.collection("notifications").doc(testNotificationId1).delete();
    await db.collection("notifications").doc(testNotificationId2).delete();
  });

  describe("GET /api/notifications/:userId", () => {
    it("should allow user to GET own notifications (200)", async () => {
      const res = await request(app)
        .get(`/api/notifications/${testUserId1}`)
        .set("Authorization", `Bearer ${token1}`)
        .expect(200);

      assert.ok(Array.isArray(res.body), "Response should be an array");
      // User should see at least their own notification
      const ownNotification = res.body.find((n) => n.id === testNotificationId1);
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

      // Verify notification was marked as read
      const notification = await db
        .collection("notifications")
        .doc(testNotificationId1)
        .get();
      assert.strictEqual(notification.data().is_read, 1);
    });

    it("should deny user PATCH other user's notification (403)", async () => {
      const res = await request(app)
        .patch(`/api/notifications/${testNotificationId2}/read`)
        .set("Authorization", `Bearer ${token1}`)
        .expect(403);

      assert.deepStrictEqual(res.body, { error: "Forbidden" });

      // Verify notification was NOT marked as read
      const notification = await db
        .collection("notifications")
        .doc(testNotificationId2)
        .get();
      assert.strictEqual(notification.data().is_read, 0);
    });

    it("should allow admin PATCH any notification (200)", async () => {
      const res = await request(app)
        .patch(`/api/notifications/${testNotificationId2}/read`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      assert.deepStrictEqual(res.body, { success: true });

      // Verify notification was marked as read
      const notification = await db
        .collection("notifications")
        .doc(testNotificationId2)
        .get();
      assert.strictEqual(notification.data().is_read, 1);
    });
  });
});
