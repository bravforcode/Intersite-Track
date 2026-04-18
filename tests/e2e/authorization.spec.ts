import { test, expect, testUtils, TEST_ACCOUNTS } from "./fixtures";

test.describe("Authorization Security", () => {
  test("admin can access /api/users but staff receives 403", async ({ page }) => {
    await testUtils.login(page, TEST_ACCOUNTS.ADMIN.email, TEST_ACCOUNTS.ADMIN.password);
    const adminUsers = await testUtils.apiRequest<Array<{ id: string; email?: string }>>(page, {
      url: "/api/users",
    });
    expect(adminUsers.status).toBe(200);
    expect(Array.isArray(adminUsers.payload)).toBeTruthy();

    await testUtils.logout(page);
    await testUtils.login(page, TEST_ACCOUNTS.STAFF.email, TEST_ACCOUNTS.STAFF.password);

    const staffUsers = await testUtils.apiRequest(page, {
      url: "/api/users",
    });
    expect(staffUsers.status).toBe(403);
  });

  test("staff only gets safe task-context users while admin-only activity feed stays protected", async ({ staffPage }) => {
    const taskContext = await testUtils.apiRequest<Array<Record<string, unknown>>>(staffPage, {
      url: "/api/users/task-context",
    });
    expect(taskContext.status).toBe(200);

    const users = taskContext.payload as Array<Record<string, unknown>>;
    expect(Array.isArray(users)).toBeTruthy();
    users.forEach(user => {
      expect("email" in user).toBeFalsy();
      expect("line_user_id" in user).toBeFalsy();
    });

    const activity = await testUtils.apiRequest(staffPage, {
      url: "/api/tasks/global/activity?limit=5",
    });
    expect(activity.status).toBe(403);
  });

  test("file downloads require authentication", async ({ authenticatedPage: page, browser }) => {
    const created = await testUtils.createTask(page);
    const upload = await testUtils.uploadAttachment(page, created.taskId);
    const downloadPath =
      (upload.payload as { download_url?: string }).download_url ??
      (upload.body as { download_url?: string }).download_url;
    expect(downloadPath).toBeTruthy();

    const downloadUrl = new URL(
      downloadPath!,
      page.url()
    ).toString();

    const unauthenticatedContext = await browser.newContext();
    const unauthenticatedPage = await unauthenticatedContext.newPage();
    const response = await unauthenticatedPage.goto(downloadUrl);

    expect(response?.status()).toBe(401);

    await unauthenticatedContext.close();
  });
});
