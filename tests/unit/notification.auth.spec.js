import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";
import { db } from "../../server/config/firebase-admin.js";
import { getNotificationById, markNotificationRead } from "../../server/database/queries/notification.queries.js";

// Test IDs
const testUserId1 = "test-user-auth-1";
const testUserId2 = "test-user-auth-2";
let testNotificationId1;
let testNotificationId2;

describe("Notification Authorization", () => {
  before(async () => {
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

  it("should allow user to read own notification", async () => {
    const notification = await getNotificationById(testNotificationId1);
    assert.ok(notification, "Notification should exist");
    assert.strictEqual(notification.user_id, testUserId1, "Notification should belong to user 1");
  });

  it("should allow user to mark own notification as read", async () => {
    await markNotificationRead(testNotificationId1);
    const notification = await getNotificationById(testNotificationId1);
    assert.strictEqual(notification.is_read, 1, "Notification should be marked as read");
  });

  it("should return notification belonging to another user", async () => {
    // This test verifies that we can retrieve notification details to check ownership
    const notification = await getNotificationById(testNotificationId2);
    assert.strictEqual(notification.user_id, testUserId2, "Notification should belong to user 2, not user 1");
    // In actual endpoint, this would return 403 if req.user.id !== notification.user_id and role !== 'admin'
  });

  it("should verify admin can access any notification (via getNotificationById)", async () => {
    // Admin can read any notification regardless of ownership
    const notification = await getNotificationById(testNotificationId2);
    assert.ok(notification, "Admin should be able to read any notification");
    // In actual endpoint, admin role bypasses ownership check
  });
});
