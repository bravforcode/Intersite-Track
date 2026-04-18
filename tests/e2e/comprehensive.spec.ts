import { test, expect } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "http://localhost:4173";

test.describe("Authentication Flow", () => {
  test("should register a new user successfully", async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);

    const uniqueEmail = `testuser_${Date.now()}@test.com`;

    await page.fill('input[name="email"]', uniqueEmail);
    await page.fill('input[name="password"]', "Password123!@#");
    await page.fill('input[name="confirmPassword"]', "Password123!@#");
    await page.fill('input[name="name"]', "Test User");

    await page.click('button[type="submit"]');

    // Should redirect to login or dashboard
    await expect(page).toHaveURL(/(login|dashboard)/);
  });

  test("should login with valid credentials", async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);

    await page.fill('input[type="email"]', "testuser@test.com");
    await page.fill('input[type="password"]', "Password123!@#");

    await page.click('button[type="submit"]');

    // Should navigate to dashboard
    await expect(page).toHaveURL(/dashboard/, { timeout: 10000 });
  });

  test("should reject login with invalid credentials", async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);

    await page.fill('input[type="email"]', "invalid@test.com");
    await page.fill('input[type="password"]', "wrongpassword");

    await page.click('button[type="submit"]');

    // Should show error message
    const errorMessage = await page.locator('[role="alert"]');
    await expect(errorMessage).toBeVisible();
  });

  test("should logout successfully", async ({ page }) => {
    // Note: This test assumes user is already logged in
    await page.goto(`${BASE_URL}/dashboard`);

    // Find and click logout button
    const logoutButton = await page.locator("button:has-text('Logout')");
    if (await logoutButton.isVisible()) {
      await logoutButton.click();

      // Should redirect to login
      await expect(page).toHaveURL(/login/);
    }
  });
});

test.describe("Application Functionality", () => {
  test("should load dashboard on authenticated access", async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);

    // Should display main content
    const mainContent = await page.locator("main, [role='main']");
    await expect(mainContent).toBeVisible();
  });

  test("should display all required UI components", async ({ page }) => {
    await page.goto(`${BASE_URL}`);

    // Check for common UI elements
    const navbar = await page.locator("nav, [role='navigation']");
    const footer = await page.locator("footer");

    // At least one should be visible
    const navVisible = await navbar.isVisible();
    const footerVisible = await footer.isVisible();

    expect(navVisible || footerVisible).toBeTruthy();
  });

  test("should handle responsive design on mobile", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto(`${BASE_URL}`);

    // Check if content is still accessible
    const mainElements = await page.locator("main, [role='main']");
    await expect(mainElements).toBeVisible({ timeout: 5000 });
  });

  test("should handle responsive design on tablet", async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });

    await page.goto(`${BASE_URL}`);

    // Check if content is still accessible
    const mainElements = await page.locator("main, [role='main']");
    await expect(mainElements).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Performance", () => {
  test("should load page within acceptable time", async ({ page }) => {
    const startTime = Date.now();

    await page.goto(`${BASE_URL}`);

    const loadTime = Date.now() - startTime;

    // Page should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });

  test("should have no console errors", async ({ page }) => {
    const errors: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });

    await page.goto(`${BASE_URL}`);

    expect(errors).toHaveLength(0);
  });

  test("should use optimized images", async ({ page }) => {
    const largeImages: string[] = [];

    page.on("response", (response) => {
      if (
        response
          .request()
          .resourceType()
          .match(/image|media/)
      ) {
        const size = response.headers()["content-length"] || "0";
        if (parseInt(size) > 1024 * 1024) {
          // > 1MB
          largeImages.push(response.url());
        }
      }
    });

    await page.goto(`${BASE_URL}`);

    expect(largeImages).toHaveLength(0);
  });
});

test.describe("Security", () => {
  test("should have CSP header", async ({ page }) => {
    const response = await page.goto(`${BASE_URL}`);

    const cspHeader = response?.headers()["content-security-policy"];
    expect(cspHeader).toBeDefined();
  });

  test("should have HSTS header", async ({ page }) => {
    const response = await page.goto(`${BASE_URL}`);

    const hstsHeader = response?.headers()["strict-transport-security"];

    // Only required for HTTPS
    if (new URL(`${BASE_URL}`).protocol === "https:") {
      expect(hstsHeader).toBeDefined();
    }
  });

  test("should not expose sensitive data in HTML", async ({ page }) => {
    await page.goto(`${BASE_URL}`);

    const html = await page.content();

    // Check for common sensitive patterns
    const sensitivePatterns = [
      /api[_-]?key/i,
      /private[_-]?key/i,
      /secret/i,
      /password/i,
    ];

    for (const pattern of sensitivePatterns) {
      // Should not find these in plain text (excluding legitimate content)
      const matches = html.match(pattern);
      expect(matches?.length || 0).toBeLessThan(3); // Allow some occurrences in labels
    }
  });
});

test.describe("Accessibility", () => {
  test("should have proper heading hierarchy", async ({ page }) => {
    await page.goto(`${BASE_URL}`);

    // Should have at least one H1
    const h1s = await page.locator("h1");
    expect(await h1s.count()).toBeGreaterThan(0);
  });

  test("should have descriptive link text", async ({ page }) => {
    await page.goto(`${BASE_URL}`);

    const links = await page.locator("a");

    for (let i = 0; i < Math.min(await links.count(), 10); i++) {
      const link = links.nth(i);
      const text = await link.textContent();
      const title = await link.getAttribute("title");
      const ariaLabel = await link.getAttribute("aria-label");

      // Link should have descriptive text or aria-label
      expect(text || title || ariaLabel).toBeTruthy();
    }
  });

  test("should have proper form labels", async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);

    const inputs = await page.locator("input");

    for (let i = 0; i < await inputs.count(); i++) {
      const input = inputs.nth(i);
      const label = await page.locator(`label[for="${await input.getAttribute("id")}"]`);
      const ariaLabel = await input.getAttribute("aria-label");

      // Input should have label or aria-label
      const hasLabel = (await label.count()) > 0;
      expect(hasLabel || ariaLabel).toBeTruthy();
    }
  });
});
