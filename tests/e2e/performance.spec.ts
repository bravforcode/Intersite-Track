import { test, expect, testUtils } from "./fixtures";

const MAX_ENDPOINT_DURATION_MS = 10_000;

test.describe("System Responsiveness", () => {
  test("tasks workspace responds within a reasonable budget", async ({ authenticatedPage: page }) => {
    const start = Date.now();
    const workspace = await testUtils.apiRequest<{
      data: unknown[];
      users: unknown[];
    }>(page, {
      url: "/api/tasks/workspace",
    });
    const duration = Date.now() - start;

    expect(workspace.status).toBe(200);
    expect(duration).toBeLessThan(MAX_ENDPOINT_DURATION_MS);
    expect(Array.isArray((workspace.payload as { data: unknown[] }).data)).toBeTruthy();
    expect(Array.isArray((workspace.payload as { users: unknown[] }).users)).toBeTruthy();
  });

  test("notifications unread-count endpoint returns quickly for the active user", async ({ authenticatedPage: page }) => {
    const currentUser = await testUtils.getSessionUser(page);
    expect(currentUser?.id).toBeTruthy();

    const start = Date.now();
    const response = await testUtils.apiRequest<{ count: number }>(page, {
      url: `/api/notifications/${currentUser.id}/unread-count`,
    });
    const duration = Date.now() - start;

    expect(response.status).toBe(200);
    expect(duration).toBeLessThan(MAX_ENDPOINT_DURATION_MS);
    expect(typeof (response.payload as { count: number }).count).toBe("number");
  });

  test("tasks page shell loads without hanging", async ({ authenticatedPage: page }) => {
    const start = Date.now();
    await Promise.all([
      page.waitForURL("**/tasks"),
      testUtils.navigateToTab(page, "จัดการงาน"),
    ]);
    const duration = Date.now() - start;

    await expect(page).toHaveURL(/\/tasks$/);
    await expect(page.locator("main")).toContainText("แสดง", { timeout: 10_000 });
    expect(duration).toBeLessThan(MAX_ENDPOINT_DURATION_MS);
  });
});
