# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: authorization.spec.ts >> Authorization Security >> staff user cannot see other staff tasks
- Location: tests\e2e\authorization.spec.ts:11:3

# Error details

```
TypeError: Cannot read properties of undefined (reading 'email')
```

# Test source

```ts
  1   | /**
  2   |  * E2E Test: Authorization and Cross-Task Security
  3   |  * Tests: Prevents users from accessing/modifying tasks they don't have access to
  4   |  * Tests: Staff cannot manipulate other staff's time entries
  5   |  * Tests: File downloads require authentication
  6   |  */
  7   | 
  8   | import { test, expect, testUtils, TEST_ACCOUNTS } from "./fixtures";
  9   | 
  10  | test.describe("Authorization Security", () => {
  11  |   test("staff user cannot see other staff tasks", async ({ page }) => {
  12  |     // Login as staff user 1
> 13  |     await testUtils.login(page, TEST_ACCOUNTS.STAFF1.email, TEST_ACCOUNTS.STAFF1.password);
      |                                                      ^ TypeError: Cannot read properties of undefined (reading 'email')
  14  | 
  15  |     // Navigate to tasks
  16  |     await page.goto("/tasks");
  17  |     await page.waitForLoadState("networkidle");
  18  | 
  19  |     const visibleTasks = await page.locator('[data-testid="task-card"]').count();
  20  |     console.log(`Staff 1 sees ${visibleTasks} tasks`);
  21  | 
  22  |     // Staff should see limited tasks (only assigned to them or visible)
  23  |     expect(visibleTasks).toBeGreaterThan(0);
  24  | 
  25  |     // Logout
  26  |     await testUtils.logout(page);
  27  | 
  28  |     // Login as staff user 2
  29  |     await testUtils.login(page, TEST_ACCOUNTS.STAFF2.email, TEST_ACCOUNTS.STAFF2.password);
  30  | 
  31  |     // Navigate to same tasks URL with direct link (if they try to access specific task)
  32  |     const taskIds = await page.evaluate(() => {
  33  |       const cards = document.querySelectorAll('[data-testid="task-card"]');
  34  |       return Array.from(cards)
  35  |         .map((card) => (card as any).dataset.taskId)
  36  |         .filter(Boolean);
  37  |     });
  38  | 
  39  |     // Staff 2 should not see tasks visible to Staff 1
  40  |     // (unless specifically assigned or shared)
  41  |     if (taskIds.length > 0) {
  42  |       const firstTaskId = taskIds[0];
  43  |       await page.goto(`/tasks/${firstTaskId}`);
  44  |       await page.waitForTimeout(1000);
  45  | 
  46  |       // Should either show task (if shared) or show 403 error
  47  |       const errorElement = page.locator('[data-testid="access-denied"]');
  48  |       const hasAccessDenied = await errorElement.isVisible().catch(() => false);
  49  | 
  50  |       // Either they see the task (if it's shared) or get denied (expected behavior)
  51  |       expect(hasAccessDenied || page.url().includes("/tasks")).toBeTruthy();
  52  |     }
  53  |   });
  54  | 
  55  |   test("admin can see all tasks", async ({ page }) => {
  56  |     await testUtils.login(page, TEST_ACCOUNTS.ADMIN.email, TEST_ACCOUNTS.ADMIN.password);
  57  | 
  58  |     await page.goto("/tasks");
  59  |     await page.waitForLoadState("networkidle");
  60  | 
  61  |     const taskCount = await page.locator('[data-testid="task-card"]').count();
  62  |     expect(taskCount).toBeGreaterThan(0);
  63  | 
  64  |     // Admin should be able to see tasks from all users
  65  |     // Verify by checking task assignments include various staff members
  66  |     const assignments = await page.evaluate(() => {
  67  |       const cards = document.querySelectorAll('[data-testid="task-card"]');
  68  |       return Array.from(cards).map((card) => 
  69  |         (card as any).innerText
  70  |       );
  71  |     });
  72  | 
  73  |     console.log(`Admin sees ${assignments.length} tasks with various assignments`);
  74  |   });
  75  | 
  76  |   test("staff cannot delete other staff's time entries", async ({ page }) => {
  77  |     // Create a task with Staff 1
  78  |     await testUtils.login(page, TEST_ACCOUNTS.STAFF1.email, TEST_ACCOUNTS.STAFF1.password);
  79  | 
  80  |     await page.goto("/tasks");
  81  |     await page.waitForLoadState("networkidle");
  82  | 
  83  |     // Open first task
  84  |     const firstTask = page.locator('[data-testid="task-card"]').first();
  85  |     await firstTask.click();
  86  |     await page.waitForLoadState("networkidle");
  87  | 
  88  |     // Find task ID from URL
  89  |     const taskIdMatch = page.url().match(/\/tasks\/([^/]+)/);
  90  |     const taskId = taskIdMatch?.[1];
  91  | 
  92  |     if (taskId) {
  93  |       // Start timer
  94  |       const playButton = page.locator('[data-testid="start-timer-btn"]');
  95  |       if (await playButton.isVisible()) {
  96  |         await playButton.click();
  97  |         await page.waitForTimeout(2000); // Let it run for 2 seconds
  98  |       }
  99  | 
  100 |       // Stop timer to create entry
  101 |       const stopButton = page.locator('[data-testid="stop-timer-btn"]');
  102 |       if (await stopButton.isVisible()) {
  103 |         await stopButton.click();
  104 |         await page.waitForLoadState("networkidle");
  105 |       }
  106 | 
  107 |       // Get the created entry ID
  108 |       const entryIdElement = page.locator('[data-testid="time-entry"]').first();
  109 |       const entryId = await entryIdElement.getAttribute("data-entry-id");
  110 | 
  111 |       if (entryId) {
  112 |         // Logout Staff 1
  113 |         await testUtils.logout(page);
```