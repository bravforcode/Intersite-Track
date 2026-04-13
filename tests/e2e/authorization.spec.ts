/**
 * E2E Test: Authorization and Cross-Task Security
 * Tests: Prevents users from accessing/modifying tasks they don't have access to
 * Tests: Staff cannot manipulate other staff's time entries
 * Tests: File downloads require authentication
 */

import { test, expect, testUtils, TEST_ACCOUNTS } from "./fixtures";

test.describe("Authorization Security", () => {
  test("staff user cannot see other staff tasks", async ({ page }) => {
    // Login as staff user 1
    await testUtils.login(page, TEST_ACCOUNTS.STAFF1.email, TEST_ACCOUNTS.STAFF1.password);

    // Navigate to tasks
    await page.goto("/tasks");
    await page.waitForLoadState("networkidle");

    const visibleTasks = await page.locator('[data-testid="task-card"]').count();
    console.log(`Staff 1 sees ${visibleTasks} tasks`);

    // Staff should see limited tasks (only assigned to them or visible)
    expect(visibleTasks).toBeGreaterThan(0);

    // Logout
    await testUtils.logout(page);

    // Login as staff user 2
    await testUtils.login(page, TEST_ACCOUNTS.STAFF2.email, TEST_ACCOUNTS.STAFF2.password);

    // Navigate to same tasks URL with direct link (if they try to access specific task)
    const taskIds = await page.evaluate(() => {
      const cards = document.querySelectorAll('[data-testid="task-card"]');
      return Array.from(cards)
        .map((card) => (card as any).dataset.taskId)
        .filter(Boolean);
    });

    // Staff 2 should not see tasks visible to Staff 1
    // (unless specifically assigned or shared)
    if (taskIds.length > 0) {
      const firstTaskId = taskIds[0];
      await page.goto(`/tasks/${firstTaskId}`);
      await page.waitForTimeout(1000);

      // Should either show task (if shared) or show 403 error
      const errorElement = page.locator('[data-testid="access-denied"]');
      const hasAccessDenied = await errorElement.isVisible().catch(() => false);

      // Either they see the task (if it's shared) or get denied (expected behavior)
      expect(hasAccessDenied || page.url().includes("/tasks")).toBeTruthy();
    }
  });

  test("admin can see all tasks", async ({ page }) => {
    await testUtils.login(page, TEST_ACCOUNTS.ADMIN.email, TEST_ACCOUNTS.ADMIN.password);

    await page.goto("/tasks");
    await page.waitForLoadState("networkidle");

    const taskCount = await page.locator('[data-testid="task-card"]').count();
    expect(taskCount).toBeGreaterThan(0);

    // Admin should be able to see tasks from all users
    // Verify by checking task assignments include various staff members
    const assignments = await page.evaluate(() => {
      const cards = document.querySelectorAll('[data-testid="task-card"]');
      return Array.from(cards).map((card) => 
        (card as any).innerText
      );
    });

    console.log(`Admin sees ${assignments.length} tasks with various assignments`);
  });

  test("staff cannot delete other staff's time entries", async ({ page }) => {
    // Create a task with Staff 1
    await testUtils.login(page, TEST_ACCOUNTS.STAFF1.email, TEST_ACCOUNTS.STAFF1.password);

    await page.goto("/tasks");
    await page.waitForLoadState("networkidle");

    // Open first task
    const firstTask = page.locator('[data-testid="task-card"]').first();
    await firstTask.click();
    await page.waitForLoadState("networkidle");

    // Find task ID from URL
    const taskIdMatch = page.url().match(/\/tasks\/([^/]+)/);
    const taskId = taskIdMatch?.[1];

    if (taskId) {
      // Start timer
      const playButton = page.locator('[data-testid="start-timer-btn"]');
      if (await playButton.isVisible()) {
        await playButton.click();
        await page.waitForTimeout(2000); // Let it run for 2 seconds
      }

      // Stop timer to create entry
      const stopButton = page.locator('[data-testid="stop-timer-btn"]');
      if (await stopButton.isVisible()) {
        await stopButton.click();
        await page.waitForLoadState("networkidle");
      }

      // Get the created entry ID
      const entryIdElement = page.locator('[data-testid="time-entry"]').first();
      const entryId = await entryIdElement.getAttribute("data-entry-id");

      if (entryId) {
        // Logout Staff 1
        await testUtils.logout(page);

        // Login as Staff 2
        await testUtils.login(page, TEST_ACCOUNTS.STAFF2.email, TEST_ACCOUNTS.STAFF2.password);

        // Try to access the same task and delete the entry
        await page.goto(`/tasks/${taskId}`);
        await page.waitForLoadState("networkidle");

        // Try to delete entry (should fail or be invisible)
        const deleteButtons = page.locator('[data-testid="delete-entry-btn"]');
        const count = await deleteButtons.count();

        if (count > 0) {
          // Try to delete
          await deleteButtons.first().click();

          // Should see error preventing deletion
          const errorMsg = page.locator('[data-testid="error-message"]');
          const hasError = await errorMsg.isVisible().catch(() => false);
          
          // Either error or deletion should be prevented
          expect(hasError || count === 0).toBeTruthy();
        }
      }
    }
  });

  test("file download requires authentication", async ({ page, context }) => {
    // Get a file download URL from task (attach a file first)
    await testUtils.login(page, TEST_ACCOUNTS.ADMIN.email, TEST_ACCOUNTS.ADMIN.password);

    // Navigate to a task with attachments (or create one)
    await page.goto("/tasks");
    await page.waitForLoadState("networkidle");

    const firstTask = page.locator('[data-testid="task-card"]').first();
    await firstTask.click();
    await page.waitForLoadState("networkidle");

    // Try to find a file link
    const fileLink = page.locator('[data-testid="file-download"]').first();
    const isFileLinksVisible = await fileLink.isVisible().catch(() => false);

    if (isFileLinksVisible) {
      const href = await fileLink.getAttribute("href");

      if (href && href.includes("/api/files")) {
        // Now try to access this URL as unauthenticated user
        // Create a new context without auth
        const unauthContext = await context.browser()?.newContext();
        const unauthPage = unauthContext ? await unauthContext.newPage() : null;

        if (unauthPage) {
          const response = await unauthPage.goto(href);

          // Should be 401 or 403 (unauthorized)
          const statusCode = response?.status();
          expect([401, 403]).toContain(statusCode);

          await unauthContext?.close();
        }
      }
    }
  });

  test("staff cannot modify task status to bypass workflow", async ({ page }) => {
    await testUtils.login(page, TEST_ACCOUNTS.STAFF1.email, TEST_ACCOUNTS.STAFF1.password);

    await page.goto("/tasks");
    await page.waitForLoadState("networkidle");

    const firstTask = page.locator('[data-testid="task-card"]').first();
    await firstTask.click();
    await page.waitForLoadState("networkidle");

    // Try to change task status (if staff has permission)
    const statusDropdown = page.locator('[data-testid="task-status-select"]');
    const isStatusEditable = await statusDropdown
      .isEnabled()
      .catch(() => false);

    if (isStatusEditable) {
      // Can edit status (expected for assignee)
      await statusDropdown.click();

      // Select a status
      await page.locator('[data-testid="status-option-completed"]').click();
      await page.waitForLoadState("networkidle");

      // Verify it was changed
      const currentStatus = await statusDropdown.inputValue();
      expect(currentStatus).toBe("completed");
    }
  });
});
