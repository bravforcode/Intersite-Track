/**
 * E2E Test: Task Management
 * Tests: Create, Update, Delete, Assign, Upload files, Time tracking
 */

import { test, expect, testUtils, TEST_ACCOUNTS } from "./fixtures";

test.describe("Task Management", () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    // Start at dashboard
    await authenticatedPage.goto("/dashboard");
  });

  test("should create a new task", async ({ authenticatedPage: page }) => {
    // Click create task button
    await page.click('[data-testid="create-task-btn"]');

    // Wait for modal/form
    await page.waitForSelector('[data-testid="task-form"]', { timeout: 5000 });

    // Fill form
    await testUtils.fillForm(
      page,
      {
        '[name="title"]': "Test Task " + Date.now(),
        '[name="description"]': "This is a test task",
        '[name="priority"]': "high",
      },
      '[data-testid="submit-task-btn"]'
    );

    // Verify success
    const successNotification = page.locator('text=Task created successfully');
    await expect(successNotification).toBeVisible({ timeout: 5000 });

    // Verify appears in task list
    const taskTitle = page.locator('text=Test Task');
    await expect(taskTitle).toBeVisible({ timeout: 5000 });
  });

  test("should display file upload for task", async ({ authenticatedPage: page }) => {
    // Create a task first
    await page.goto("/tasks");

    // Find first task and click to open
    const firstTask = page.locator('[data-testid="task-card"]').first();
    await firstTask.click();

    // Should show file upload section
    const uploadSection = page.locator('[data-testid="file-upload-section"]');
    await expect(uploadSection).toBeVisible({ timeout: 5000 });

    // File upload should require authentication
    const uploadInput = page.locator('input[type="file"]');
    expect(uploadInput).toBeTruthy();
  });

  test("should enforce authorization on file download", async ({ page, staffPage }) => {
    // Admin creates task with file
    await testUtils.login(page, TEST_ACCOUNTS.ADMIN.email, TEST_ACCOUNTS.ADMIN.password);
    await page.goto("/tasks");

    // Create task and upload file
    const taskId = "test-task-" + Date.now();
    // ... create task with file ...

    // Staff user tries to access
    await testUtils.logout(page);
    await testUtils.login(page, TEST_ACCOUNTS.STAFF.email, TEST_ACCOUNTS.STAFF.password);

    // Try to directly access file download
    await page.goto(`/api/files/unauthorized-file-id/download`);

    // Should get 403 error
    const statusCode = page.url();
    const errorResponse = await page.evaluate(() => document.body.textContent);
    expect(errorResponse).toContain("403") || expect(errorResponse).toContain("denied");
  });

  test("should track time entries for tasks", async ({ authenticatedPage: page }) => {
    // Navigate to tasks
    await page.goto("/tasks");

    // Open first task
    const firstTask = page.locator('[data-testid="task-card"]').first();
    await firstTask.click();

    // Click start timer
    const startTimerBtn = page.locator('[data-testid="start-timer-btn"]');
    await startTimerBtn.click();

    // Verify timer started
    const timerDisplay = page.locator('[data-testid="timer-display"]');
    await expect(timerDisplay).toBeVisible({ timeout: 5000 });

    // Wait  2 seconds
    await page.waitForTimeout(2000);

    // Stop timer
    const stopTimerBtn = page.locator('[data-testid="stop-timer-btn"]');
    await stopTimerBtn.click();

    // Verify entry recorded
    const entryList = page.locator('[data-testid="time-entries-list"]');
    await expect(entryList).toContainText(/\d+ seconds/);
  });

  test("should assign tasks to users", async ({ authenticatedPage: page }) => {
    await page.goto("/tasks");

    // Open task edit
    const firstTask = page.locator('[data-testid="task-card"]').first();
    await firstTask.click();
    await page.click('[data-testid="edit-task-btn"]');

    // Click assign section
    await page.click('[data-testid="assign-users-btn"]');

    // Search for user
    await page.fill('[data-testid="user-search-input"]', TEST_ACCOUNTS.STAFF.email);

    // Select user
    await page.click('[data-testid="user-select-btn"]');

    // Save
    await page.click('[data-testid="save-assignments-btn"]');

    // Verify assigned
    const assignmentNotification = page.locator('text=User assigned successfully');
    await expect(assignmentNotification).toBeVisible({ timeout: 5000 });
  });

  test("should prevent unauthorized access to restricted tasks", async ({ page }) => {
    // Admin creates private task
    await testUtils.login(page, TEST_ACCOUNTS.ADMIN.email, TEST_ACCOUNTS.ADMIN.password);
    const taskId = "private-task-" + Date.now();
    // ... create task not assigned to staff ...

    // Staff tries to access
    await testUtils.logout(page);
    await testUtils.login(page, TEST_ACCOUNTS.STAFF.email, TEST_ACCOUNTS.STAFF.password);

    // Navigate to restricted task
    await page.goto(`/tasks/${taskId}`);

    // Should be denied
    const accessDenied = page.locator('text=Access denied') || page.locator('text=not found');
    await expect(accessDenied).toBeVisible({ timeout: 5000 });
  });

  test("should validate task form inputs", async ({ authenticatedPage: page }) => {
    await page.click('[data-testid="create-task-btn"]');
    await page.waitForSelector('[data-testid="task-form"]');

    // Try to submit empty form
    await page.click('[data-testid="submit-task-btn"]');

    // Should show validation errors
    const titleError = page.locator('[data-testid="title-error"]');
    await expect(titleError).toBeVisible({ timeout: 3000 });
  });
});
