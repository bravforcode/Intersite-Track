import { test, expect, testUtils, TEST_ACCOUNTS } from "./fixtures";

const MAX_PAGE_LOAD_MS = 5_000;

test.describe("Core Authentication Flow", () => {
  test("logs in with valid admin credentials and renders the dashboard shell", async ({ page }) => {
    await testUtils.login(page, TEST_ACCOUNTS.ADMIN.email, TEST_ACCOUNTS.ADMIN.password);

    const user = await testUtils.getSessionUser(page);
    expect(user?.email).toBe(TEST_ACCOUNTS.ADMIN.email);
    expect(user?.role).toBe("admin");
    await expect(page.getByRole("heading", { name: "แดชบอร์ด" })).toBeVisible();
  });

  test("rejects invalid credentials without clearing the login page", async ({ page }) => {
    await page.goto("/");
    await testUtils.waitForCorrectApp(page);
    await testUtils.waitForBackendReady(page);

    await page.locator('input[type="email"]').fill("invalid@taskam.local");
    await page.locator('input[type="password"]').fill("wrong-password");
    await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click({ noWaitAfter: true });

    await expect(
      page.getByText(/อีเมลหรือรหัสผ่านไม่ถูกต้อง|พยายามเข้าสู่ระบบบ่อยเกินไป/)
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test("logs out and returns to the login form", async ({ page }) => {
    await testUtils.login(page, TEST_ACCOUNTS.ADMIN.email, TEST_ACCOUNTS.ADMIN.password);
    await testUtils.logout(page);

    expect(await testUtils.getSessionUser(page)).toBeNull();
    await expect(page.getByRole("button", { name: "เข้าสู่ระบบ" })).toBeVisible();
  });
});

test.describe("Application Functionality", () => {
  test("admin sees the main enterprise modules in navigation", async ({ authenticatedPage: page }) => {
    const navigation = page.locator("nav:visible").first();

    await expect(navigation.getByRole("button", { name: /^จัดการงาน$/ })).toBeVisible();
    await expect(navigation.getByRole("button", { name: /^พนักงาน$/ })).toBeVisible();
    await expect(navigation.getByRole("button", { name: /^รายงาน$/ })).toBeVisible();
    await expect(navigation.getByRole("button", { name: /^ข้อมูลพื้นฐาน$/ })).toBeVisible();
  });

  test("staff sees the staff-safe navigation surface only", async ({ staffPage: page }) => {
    await testUtils.openSidebar(page);
    const navigation = page.locator("nav").first();

    await expect(navigation.getByRole("button", { name: /^จัดการงาน$/ })).toBeVisible();
    await expect(navigation.getByRole("button", { name: /^พนักงาน$/ })).toHaveCount(0);
    await expect(navigation.getByRole("button", { name: /^รายงาน$/ })).toHaveCount(0);
    await expect(navigation.getByRole("button", { name: /^ข้อมูลพื้นฐาน$/ })).toHaveCount(0);
  });

  test("mobile viewport keeps navigation and page content usable", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await testUtils.login(page, TEST_ACCOUNTS.ADMIN.email, TEST_ACCOUNTS.ADMIN.password);

    await Promise.all([
      page.waitForURL(/\/tasks$/, { timeout: 15_000 }),
      testUtils.navigateToTab(page, "จัดการงาน"),
    ]);

    await expect(page.locator('button[aria-label="เปิดเมนูหลัก"]')).toBeVisible();
    await expect(page).toHaveURL(/\/tasks$/);
    await expect(page.getByRole("heading", { name: "จัดการงาน" })).toBeVisible();
  });
});

test.describe("Performance And Runtime Safety", () => {
  test("loads the first screen within an acceptable local budget", async ({ page }) => {
    const start = Date.now();
    await page.goto("/");
    await testUtils.waitForCorrectApp(page);
    expect(Date.now() - start).toBeLessThan(MAX_PAGE_LOAD_MS);
  });

  test("does not emit browser console errors on the login screen", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await page.goto("/");
    await testUtils.waitForCorrectApp(page);

    expect(errors).toHaveLength(0);
  });

  test("serves API security headers from the backend boundary", async ({ page }) => {
    const response = await page.goto("/api/health");

    expect(response?.status()).toBe(200);
    expect(response?.headers()["content-security-policy"]).toBeTruthy();
    expect(response?.headers()["x-content-type-options"]).toBe("nosniff");
  });

  test("does not expose obvious secret material in the public login HTML", async ({ page }) => {
    await page.goto("/");
    const html = await page.content();

    expect(html).not.toMatch(/private[_-]?key|secret[_-]?key|api[_-]?key\s*=/i);
  });
});

test.describe("Accessibility Surface", () => {
  test("has a single main landmark and labelled login fields", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator("main")).toHaveCount(1);
    await expect(page.locator('input[type="email"]')).toHaveAttribute("aria-label", "อีเมล");
    await expect(page.locator('input[type="password"]')).toHaveAttribute("aria-label", "รหัสผ่าน");
  });

  test("has descriptive button text for visible buttons", async ({ page }) => {
    await page.goto("/");
    const buttons = page.locator("button:visible");
    const count = Math.min(await buttons.count(), 10);

    for (let i = 0; i < count; i += 1) {
      const button = buttons.nth(i);
      const label = [
        await button.textContent(),
        await button.getAttribute("aria-label"),
        await button.getAttribute("title"),
      ]
        .filter(Boolean)
        .join(" ")
        .trim();

      expect(label.length).toBeGreaterThan(0);
    }
  });
});
