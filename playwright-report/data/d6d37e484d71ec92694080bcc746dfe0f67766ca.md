# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: authorization.spec.ts >> Authorization Security >> staff cannot modify task status to bypass workflow
- Location: tests\e2e\authorization.spec.ts:179:3

# Error details

```
TypeError: Cannot read properties of undefined (reading 'email')
```

# Test source

```ts
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
  114 | 
  115 |         // Login as Staff 2
  116 |         await testUtils.login(page, TEST_ACCOUNTS.STAFF2.email, TEST_ACCOUNTS.STAFF2.password);
  117 | 
  118 |         // Try to access the same task and delete the entry
  119 |         await page.goto(`/tasks/${taskId}`);
  120 |         await page.waitForLoadState("networkidle");
  121 | 
  122 |         // Try to delete entry (should fail or be invisible)
  123 |         const deleteButtons = page.locator('[data-testid="delete-entry-btn"]');
  124 |         const count = await deleteButtons.count();
  125 | 
  126 |         if (count > 0) {
  127 |           // Try to delete
  128 |           await deleteButtons.first().click();
  129 | 
  130 |           // Should see error preventing deletion
  131 |           const errorMsg = page.locator('[data-testid="error-message"]');
  132 |           const hasError = await errorMsg.isVisible().catch(() => false);
  133 |           
  134 |           // Either error or deletion should be prevented
  135 |           expect(hasError || count === 0).toBeTruthy();
  136 |         }
  137 |       }
  138 |     }
  139 |   });
  140 | 
  141 |   test("file download requires authentication", async ({ page, context }) => {
  142 |     // Get a file download URL from task (attach a file first)
  143 |     await testUtils.login(page, TEST_ACCOUNTS.ADMIN.email, TEST_ACCOUNTS.ADMIN.password);
  144 | 
  145 |     // Navigate to a task with attachments (or create one)
  146 |     await page.goto("/tasks");
  147 |     await page.waitForLoadState("networkidle");
  148 | 
  149 |     const firstTask = page.locator('[data-testid="task-card"]').first();
  150 |     await firstTask.click();
  151 |     await page.waitForLoadState("networkidle");
  152 | 
  153 |     // Try to find a file link
  154 |     const fileLink = page.locator('[data-testid="file-download"]').first();
  155 |     const isFileLinksVisible = await fileLink.isVisible().catch(() => false);
  156 | 
  157 |     if (isFileLinksVisible) {
  158 |       const href = await fileLink.getAttribute("href");
  159 | 
  160 |       if (href && href.includes("/api/files")) {
  161 |         // Now try to access this URL as unauthenticated user
  162 |         // Create a new context without auth
  163 |         const unauthContext = await context.browser()?.newContext();
  164 |         const unauthPage = unauthContext ? await unauthContext.newPage() : null;
  165 | 
  166 |         if (unauthPage) {
  167 |           const response = await unauthPage.goto(href);
  168 | 
  169 |           // Should be 401 or 403 (unauthorized)
  170 |           const statusCode = response?.status();
  171 |           expect([401, 403]).toContain(statusCode);
  172 | 
  173 |           await unauthContext?.close();
  174 |         }
  175 |       }
  176 |     }
  177 |   });
  178 | 
  179 |   test("staff cannot modify task status to bypass workflow", async ({ page }) => {
> 180 |     await testUtils.login(page, TEST_ACCOUNTS.STAFF1.email, TEST_ACCOUNTS.STAFF1.password);
      |                                                      ^ TypeError: Cannot read properties of undefined (reading 'email')
  181 | 
  182 |     await page.goto("/tasks");
  183 |     await page.waitForLoadState("networkidle");
  184 | 
  185 |     const firstTask = page.locator('[data-testid="task-card"]').first();
  186 |     await firstTask.click();
  187 |     await page.waitForLoadState("networkidle");
  188 | 
  189 |     // Try to change task status (if staff has permission)
  190 |     const statusDropdown = page.locator('[data-testid="task-status-select"]');
  191 |     const isStatusEditable = await statusDropdown
  192 |       .isEnabled()
  193 |       .catch(() => false);
  194 | 
  195 |     if (isStatusEditable) {
  196 |       // Can edit status (expected for assignee)
  197 |       await statusDropdown.click();
  198 | 
  199 |       // Select a status
  200 |       await page.locator('[data-testid="status-option-completed"]').click();
  201 |       await page.waitForLoadState("networkidle");
  202 | 
  203 |       // Verify it was changed
  204 |       const currentStatus = await statusDropdown.inputValue();
  205 |       expect(currentStatus).toBe("completed");
  206 |     }
  207 |   });
  208 | });
  209 | 
```