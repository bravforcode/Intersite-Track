/**
 * Playwright Test Fixtures & Utilities
 * Provides authenticated user contexts and common helpers
 */

import { test as base, expect } from "@playwright/test";
import { Page } from "@playwright/test";

/**
 * Test data - update these with your actual test accounts
 */
export const TEST_ACCOUNTS = {
  ADMIN: {
    email: "admin@test.com",
    password: "Admin@123456",
    role: "admin",
  },
  STAFF: {
    email: "staff@test.com",
    password: "Staff@123456",
    role: "staff",
  },
  USER: {
    email: "user@test.com",
    password: "User@123456",
    role: "user",
  },
};

/**
 * Fixture: Authenticated admin user
 */
export const test = base.extend({
  authenticatedPage: async ({ page }, use) => {
    // Navigate to login
    await page.goto("/");

    // Wait for auth state
    await page.waitForURL("**/login", { timeout: 5000 }).catch(() => null);

    // Check if already logged in
    const isLoggedIn = await page.evaluate(() => {
      const user = sessionStorage.getItem("user");
      return user !== null;
    });

    if (!isLoggedIn) {
      // Log in as admin
      await page.fill('input[type="email"]', TEST_ACCOUNTS.ADMIN.email);
      await page.fill('input[type="password"]', TEST_ACCOUNTS.ADMIN.password);
      await page.click('button[type="submit"]');

      // Wait for dashboard
      await page.waitForURL("**/dashboard", { timeout: 10000 });
    }

    await use(page);
  },

  staffPage: async ({ page }, use) => {
    await page.goto("/");
    const isLoggedIn = await page.evaluate(() => sessionStorage.getItem("user") !== null);

    if (!isLoggedIn) {
      await page.fill('input[type="email"]', TEST_ACCOUNTS.STAFF.email);
      await page.fill('input[type="password"]', TEST_ACCOUNTS.STAFF.password);
      await page.click('button[type="submit"]');
      await page.waitForURL("**/dashboard", { timeout: 10000 });
    }

    await use(page);
  },
});

/**
 * Common test utilities
 */
export const testUtils = {
  /**
   * Login helper
   */
  async login(page: Page, email: string, password: string) {
    await page.goto("/");
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard", { timeout: 10000 });
  },

  /**
   * Logout helper
   */
  async logout(page: Page) {
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout-btn"]');
    await page.waitForURL("**/login", { timeout: 5000 });
  },

  /**
   * Wait for API response
   */
  async waitForApi(page: Page, pattern: string | RegExp) {
    return page.waitForResponse(
      (response) =>
        response.request().url().includes(pattern.toString()) &&
        response.status() < 400,
      { timeout: 10000 }
    );
  },

  /**
   * Check for accessibility violations
   */
  async checkAccessibility(page: Page) {
    const violations = [];

    // Check for missing alt text on images
    const imagesWithoutAlt = await page.locator("img:not([alt])").count();
    if (imagesWithoutAlt > 0) {
      violations.push(`${imagesWithoutAlt} images missing alt text`);
    }

    // Check for missing form labels
    const inputsWithoutLabel = await page
      .locator('input:not([aria-label]):not([type="hidden"])')
      .count();
    if (inputsWithoutLabel > 0) {
      violations.push(`${inputsWithoutLabel} inputs missing labels`);
    }

    // Check for color contrast (basic)
    const lowContrast = await page.evaluate(() => {
      // Placeholder - real contrast checking requires more complex logic
      return document.querySelectorAll("[style*='color']").length;
    });

    return violations;
  },

  /**
   * Upload file
   */
  async uploadFile(page: Page, inputSelector: string, filePath: string) {
    const fileInput = page.locator(inputSelector);
    await fileInput.setInputFiles(filePath);
  },

  /**
   * Fill and submit form
   */
  async fillForm(page: Page, fields: Record<string, string>, submitButtonSelector?: string) {
    for (const [selector, value] of Object.entries(fields)) {
      const element = page.locator(selector).first();
      const tagName = await element.evaluate((el) => el.tagName.toLowerCase());

      if (tagName === "select") {
        await element.selectOption(value);
      } else {
        await element.fill(value);
      }
    }

    if (submitButtonSelector) {
      await page.click(submitButtonSelector);
    }
  },

  /**
   * Wait for notification
   */
  async waitForNotification(page: Page, text: string, timeout: number = 5000) {
    await page.locator(`text=${text}`).waitFor({ timeout });
  },

  /**
   * Take screenshot with readable name
   */
  async screenshot(page: Page, name: string) {
    await page.screenshot({ path: `test-results/screenshots/${name}.png` });
  },
};

export { expect };
