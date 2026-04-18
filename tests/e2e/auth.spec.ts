import { test, expect, testUtils, TEST_ACCOUNTS } from "./fixtures";

test.describe("Authentication", () => {
  test("logs in with valid credentials and stores the user profile", async ({ page }) => {
    await testUtils.login(page, TEST_ACCOUNTS.ADMIN.email, TEST_ACCOUNTS.ADMIN.password);

    const userProfile = await testUtils.getSessionUser(page);

    expect(userProfile).toBeTruthy();
    expect(userProfile.email).toBe(TEST_ACCOUNTS.ADMIN.email);
    expect(userProfile.role).toBe("admin");
    expect(page.url()).toMatch(/\/$/);
  });

  test("rejects invalid credentials", async ({ page }) => {
    await page.goto("/");
    await page.locator('input[type="email"]').fill("invalid@taskam.local");
    await page.locator('input[type="password"]').fill("wrong-password");
    await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click({ noWaitAfter: true });

    await expect(
      page.getByText(/อีเมลหรือรหัสผ่านไม่ถูกต้อง|พยายามเข้าสู่ระบบบ่อยเกินไป/)
    ).toBeVisible({
      timeout: 10_000,
    });
  });

  test("persists the authenticated session after reload", async ({ page }) => {
    await testUtils.login(page, TEST_ACCOUNTS.ADMIN.email, TEST_ACCOUNTS.ADMIN.password);

    await page.reload();
    await testUtils.waitForAuthenticatedShell(page);
    await expect(page.getByRole("heading", { name: "แดชบอร์ด" })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.locator('input[type="email"]')).toHaveCount(0);
  });

  test("logs out and clears the session cache", async ({ page }) => {
    await testUtils.login(page, TEST_ACCOUNTS.ADMIN.email, TEST_ACCOUNTS.ADMIN.password);
    await testUtils.logout(page);

    const userProfile = await testUtils.getSessionUser(page);
    expect(userProfile).toBeNull();
  });

  test("blocks weak passwords in signup before hitting the backend", async ({ page }) => {
    await page.goto("/");
    await testUtils.waitForCorrectApp(page);
    await page.getByRole("button", { name: "สร้างบัญชีใหม่" }).click({ force: true, noWaitAfter: true });

    const email = `playwright-${Date.now()}@taskam.local`;
    const signupForm = page.locator("form").filter({
      has: page.getByRole("button", { name: /^สร้างบัญชี$/ }),
    });
    await expect(signupForm).toBeVisible({ timeout: 10_000 });

    const signupEmail = signupForm.locator('input[type="email"]');
    const signupPassword = signupForm.locator('input[autocomplete="new-password"]').first();
    const signupConfirmPassword = signupForm.locator('input[autocomplete="new-password"]').nth(1);

    await signupEmail.fill(email);
    await expect(signupEmail).toHaveValue(email);
    await signupPassword.fill("weakpass123");
    await signupConfirmPassword.fill("weakpass123");
    await page.getByRole("button", { name: "สร้างบัญชี" }).click();

    await expect(page.getByText("รหัสผ่านต้องมีตัวพิมพ์ใหญ่อย่างน้อย 1 ตัว")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("blocks weak passwords in the profile password-change flow", async ({ page }) => {
    await testUtils.login(page, TEST_ACCOUNTS.ADMIN.email, TEST_ACCOUNTS.ADMIN.password);
    await testUtils.openProfile(page, TEST_ACCOUNTS.ADMIN.displayName);
    const profileDialog = page.getByRole("dialog", { name: "โปรไฟล์" });
    await expect(profileDialog).toBeVisible({ timeout: 10_000 });
    await profileDialog.getByRole("button", { name: "เปลี่ยนรหัสผ่าน" }).first().click({
      force: true,
      noWaitAfter: true,
    });
    await expect(profileDialog.locator('input[type="password"]').first()).toBeVisible({
      timeout: 10_000,
    });

    await profileDialog.locator('input[type="password"]').first().fill(TEST_ACCOUNTS.ADMIN.password);
    await profileDialog.locator('input[type="password"]').nth(1).fill("alllowercase123");
    await profileDialog.locator('input[type="password"]').nth(2).fill("alllowercase123");
    await profileDialog
      .locator("form")
      .getByRole("button", { name: "เปลี่ยนรหัสผ่าน" })
      .click({ force: true, noWaitAfter: true });

    await expect(page.getByText("รหัสผ่านต้องมีตัวพิมพ์ใหญ่อย่างน้อย 1 ตัว")).toBeVisible({
      timeout: 10_000,
    });
  });
});
