/**
 * E2E Test: Authentication Flow
 * Tests: Login, Signup, Password change, Session management
 */

import { test, expect, testUtils, TEST_ACCOUNTS } from "./fixtures";

test.describe("Authentication", () => {
  test("should login with valid credentials", async ({ page }) => {
    await page.goto("/");

    // Fill login form
    await page.fill('input[type="email"]', TEST_ACCOUNTS.ADMIN.email);
    await page.fill('input[type="password"]', TEST_ACCOUNTS.ADMIN.password);

    // Submit
    const responsePromise = page.waitForResponse(
      (response) => response.url().includes("/api/auth/") && response.status() === 200
    );
    await page.click('button[type="submit"]');

    // Verify successful response
    const response = await responsePromise;
    expect(response.ok()).toBeTruthy();

    // Verify navigation to dashboard
    await page.waitForURL("**/dashboard", { timeout: 10000 });
    expect(page.url()).toContain("/dashboard");
  });

  test("should reject invalid credentials", async ({ page }) => {
    await page.goto("/");

    await page.fill('input[type="email"]', "invalid@test.com");
    await page.fill('input[type="password"]', "wrongpassword");

    await page.click('button[type="submit"]');

    // Look for error message
    const errorMessage = page.locator('[data-testid="login-error"]');
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
  });

  test("should store user profile in session", async ({ page }) => {
    await testUtils.login(page, TEST_ACCOUNTS.ADMIN.email, TEST_ACCOUNTS.ADMIN.password);

    const userProfile = await page.evaluate(() => {
      const user = sessionStorage.getItem("user");
      return user ? JSON.parse(user) : null;
    });

    expect(userProfile).toBeTruthy();
    expect(userProfile.email).toBe(TEST_ACCOUNTS.ADMIN.email);
    expect(userProfile.role).toBe("admin");
  });

  test("should persist session on page reload", async ({ page }) => {
    await testUtils.login(page, TEST_ACCOUNTS.ADMIN.email, TEST_ACCOUNTS.ADMIN.password);

    // Get user profile before reload
    const profileBefore = await page.evaluate(() => sessionStorage.getItem("user"));

    // Reload page
    await page.reload();

    // Check if still logged in and profile persists
    await page.waitForURL("**/dashboard", { timeout: 5000 });
    const profileAfter = await page.evaluate(() => sessionStorage.getItem("user"));

    expect(profileAfter).toBe(profileBefore);
  });

  test("should logout successfully", async ({ page }) => {
    await testUtils.login(page, TEST_ACCOUNTS.ADMIN.email, TEST_ACCOUNTS.ADMIN.password);

    // Find and click logout button
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout-btn"]');

    // Verify redirected to login
    await page.waitForURL("**/login", { timeout: 5000 });
    expect(page.url()).toContain("/login");

    // Verify session cleared
    const user = await page.evaluate(() => sessionStorage.getItem("user"));
    expect(user).toBeNull();
  });

  test("should require reauthentication for password change", async ({ page }) => {
    await testUtils.login(page, TEST_ACCOUNTS.ADMIN.email, TEST_ACCOUNTS.ADMIN.password);

    // Navigate to password change
    await page.goto("/settings/password");

    // Try to change without current password
    await page.fill('[name="new_password"]', "NewPass@123456");
    await page.fill('[name="confirm_password"]', "NewPass@123456");
    await page.click('button[type="submit"]');

    // Should show error asking for current password
    const errorMessage = page.locator('[data-testid="current-password-error"]');
    await expect(errorMessage).toBeVisible({ timeout: 5000 });

    // Fill current password
    await page.fill('[name="current_password"]', TEST_ACCOUNTS.ADMIN.password);
    await page.click('button[type="submit"]');

    // Should succeed
    const successMessage = page.locator('[data-testid="password-change-success"]');
    await expect(successMessage).toBeVisible({ timeout: 5000 });
  });

  test("should enforce password complexity requirements", async ({ page }) => {
    await page.goto("/signup");

    const testCases = [
      { password: "short", error: "at least 8 characters" },
      { password: "nouppercase123", error: "uppercase" },
      { password: "NOLOWERCASE123", error: "lowercase" },
      { password: "NoNumbers", error: "number" },
    ];

    for (const { password, error } of testCases) {
      await page.fill('input[name="password"]', password);
      const helpText = page.locator('text=' + error);
      await expect(helpText).toBeVisible({ timeout: 3000 });
    }
  });
});
