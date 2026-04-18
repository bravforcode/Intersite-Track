import { test, expect, testUtils, TEST_ACCOUNTS } from "./fixtures";

test.describe("Task Management", () => {
  test("admin can create a task and see it in the workspace and UI", async ({ authenticatedPage: page }) => {
    const created = await testUtils.createTask(page);

    const workspace = await testUtils.apiRequest<{
      data: Array<{ id: string; title: string }>;
      users: Array<{ id: string }>;
    }>(page, {
      url: "/api/tasks/workspace",
    });

    expect(workspace.status).toBe(200);
    expect(Array.isArray((workspace.payload as { data: unknown[] }).data)).toBeTruthy();
    expect(
      (workspace.payload as { data: Array<{ id: string }> }).data.some(task => task.id === created.taskId)
    ).toBeTruthy();

    const taskDetails = await testUtils.apiRequest<{ id: string; title: string }>(page, {
      url: `/api/tasks/${created.taskId}`,
    });

    expect(taskDetails.status).toBe(200);
    expect((taskDetails.payload as { title: string }).title).toBe(created.title);
  });

  test("authenticated upload returns a secure download URL that works for the same user", async ({ authenticatedPage: page }) => {
    const created = await testUtils.createTask(page);
    const upload = await testUtils.uploadAttachment(page, created.taskId);

    expect(upload.status).toBe(201);
    expect((upload.payload as { download_url: string }).download_url).toMatch(/^\/api\/files\/.+\/download$/);

    const download = await testUtils.apiRequest<string>(page, {
      url: (upload.payload as { download_url: string }).download_url,
    });

    expect(download.status).toBe(200);
    expect(download.contentType).toContain("image/png");
  });

  test("staff can read the workspace but cannot create admin-only tasks", async ({ staffPage: page }) => {
    const currentUser = await testUtils.getSessionUser(page);
    expect(currentUser?.id).toBeTruthy();

    const workspace = await testUtils.apiRequest<{
      data: unknown[];
      users: Array<{ id: string; email?: string }>;
    }>(page, {
      url: `/api/tasks/workspace?user_id=${encodeURIComponent(currentUser.id)}`,
    });

    expect(workspace.status).toBe(200);
    expect(Array.isArray((workspace.payload as { data: unknown[] }).data)).toBeTruthy();
    expect(Array.isArray((workspace.payload as { users: unknown[] }).users)).toBeTruthy();

    const createAttempt = await testUtils.apiRequest(page, {
      url: "/api/tasks",
      method: "POST",
      body: {
        title: `Unauthorized task ${Date.now()}`,
        description: "This should be blocked for staff",
      },
    });

    expect(createAttempt.status).toBe(403);
  });
});
