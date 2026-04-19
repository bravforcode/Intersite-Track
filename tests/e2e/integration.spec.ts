import { test, expect, testUtils, TEST_ACCOUNTS } from "./fixtures";

test.describe("API Integration Contracts", () => {
  test("health and CSRF endpoints are available before authentication", async ({ page }) => {
    await page.goto("/");
    await testUtils.waitForBackendReady(page);

    const csrf = await page.evaluate(async () => {
      const response = await fetch("/api/csrf-token", { credentials: "include" });
      const body = await response.json();
      return {
        status: response.status,
        token: response.headers.get("X-CSRF-Token") ?? body.csrfToken,
      };
    });

    expect(csrf.status).toBe(200);
    expect(csrf.token).toBeTruthy();
  });

  test("authenticated profile returns the active user's role and email", async ({ authenticatedPage: page }) => {
    const profile = await testUtils.apiRequest<{
      email: string;
      role: string;
    }>(page, {
      url: "/api/auth/profile",
      method: "POST",
      body: {},
    });

    expect(profile.status).toBe(200);
    expect((profile.payload as { email: string }).email).toBe(TEST_ACCOUNTS.ADMIN.email);
    expect((profile.payload as { role: string }).role).toBe("admin");
  });

  test("admin user directory includes full user data while staff directory is protected", async ({ page }) => {
    await testUtils.login(page, TEST_ACCOUNTS.ADMIN.email, TEST_ACCOUNTS.ADMIN.password);

    const adminUsers = await testUtils.apiRequest<Array<Record<string, unknown>>>(page, {
      url: "/api/users",
    });
    expect(adminUsers.status).toBe(200);
    expect(Array.isArray(adminUsers.payload)).toBeTruthy();
    expect((adminUsers.payload as Array<Record<string, unknown>>).some(user => user.email)).toBeTruthy();

    await testUtils.logout(page);
    await testUtils.login(page, TEST_ACCOUNTS.STAFF.email, TEST_ACCOUNTS.STAFF.password);

    const staffUsers = await testUtils.apiRequest(page, { url: "/api/users" });
    expect(staffUsers.status).toBe(403);
  });

  test("staff task-context users do not expose email or LINE identifiers", async ({ staffPage: page }) => {
    const taskContext = await testUtils.apiRequest<Array<Record<string, unknown>>>(page, {
      url: "/api/users/task-context",
    });

    expect(taskContext.status).toBe(200);
    for (const user of taskContext.payload as Array<Record<string, unknown>>) {
      expect("email" in user).toBeFalsy();
      expect("line_user_id" in user).toBeFalsy();
    }
  });

  test("admin can create and read a task through the workspace API", async ({ authenticatedPage: page }) => {
    const created = await testUtils.createTask(page);

    const task = await testUtils.apiRequest<Record<string, unknown>>(page, {
      url: `/api/tasks/${created.taskId}`,
    });
    const workspace = await testUtils.apiRequest<{ data: Array<{ id: string }> }>(page, {
      url: "/api/tasks/workspace",
    });

    expect(task.status).toBe(200);
    expect((task.payload as { id: string }).id).toBe(created.taskId);
    expect(workspace.status).toBe(200);
    expect((workspace.payload as { data: Array<{ id: string }> }).data.some(t => t.id === created.taskId)).toBeTruthy();
  });

  test("staff cannot create admin-only task records", async ({ staffPage: page }) => {
    const response = await testUtils.apiRequest(page, {
      url: "/api/tasks",
      method: "POST",
      body: {
        title: `Staff Forbidden Task ${Date.now()}`,
        description: "This should be rejected by role policy",
        priority: "medium",
      },
    });

    expect(response.status).toBe(403);
  });

  test("task upload and secure download return the uploaded file content type", async ({ authenticatedPage: page }) => {
    const created = await testUtils.createTask(page);
    const upload = await testUtils.uploadAttachment(page, created.taskId);
    const downloadPath =
      (upload.payload as { download_url?: string }).download_url ??
      (upload.body as { download_url?: string }).download_url;

    expect(upload.status).toBe(201);
    expect(downloadPath).toBeTruthy();

    const download = await testUtils.apiRequest<string>(page, {
      url: downloadPath!,
    });

    expect(download.status).toBe(200);
    expect(download.contentType).toContain("image/png");
  });

  test("unauthenticated protected resources return 401", async ({ page }) => {
    await page.goto("/");

    const response = await page.evaluate(async () => {
      const result = await fetch("/api/tasks/workspace", { credentials: "include" });
      return result.status;
    });

    expect(response).toBe(401);
  });

  test("missing task records return 404 for authenticated users", async ({ authenticatedPage: page }) => {
    const response = await testUtils.apiRequest(page, {
      url: "/api/tasks/nonexistent-id",
    });

    expect(response.status).toBe(404);
  });
});
