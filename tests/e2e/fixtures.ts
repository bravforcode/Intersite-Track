import { test as base, expect, type Locator, type Page } from "@playwright/test";

type Account = {
  email: string;
  password: string;
  role: "admin" | "staff";
  displayName: string;
};

type ApiResponse<T = unknown> = {
  status: number;
  ok: boolean;
  body: T;
  payload: unknown;
  contentType: string;
};

function getEnv(name: string, fallback: string): string {
  return process.env[name]?.trim() || fallback;
}

export const TEST_ACCOUNTS: Record<"ADMIN" | "STAFF", Account> = {
  ADMIN: {
    email: getEnv("E2E_ADMIN_EMAIL", "admin@taskam.local"),
    password: getEnv("E2E_ADMIN_PASSWORD", "admin123"),
    role: "admin",
    displayName: getEnv("E2E_ADMIN_NAME", "แอดมิน"),
  },
  STAFF: {
    email: getEnv("E2E_STAFF_EMAIL", "somchai@taskam.local"),
    password: getEnv("E2E_STAFF_PASSWORD", "staff123"),
    role: "staff",
    displayName: getEnv("E2E_STAFF_NAME", "สมชาย"),
  },
};

async function getFirebaseToken(page: Page): Promise<string | null> {
  return page.evaluate(async () => {
    const { auth } = await import("/src/lib/firebase.ts");
    const currentUser = auth.currentUser;
    return currentUser ? currentUser.getIdToken() : null;
  });
}

function isMobileViewport(page: Page): boolean {
  const size = page.viewportSize();
  return size ? size.width <= 500 : false;
}

async function activate(page: Page, locator: Locator) {
  await locator.scrollIntoViewIfNeeded().catch(() => null);
  const options = { force: true, noWaitAfter: true, timeout: 10_000 };

  if (isMobileViewport(page)) {
    await locator.tap(options).catch(async () => locator.click(options));
    return;
  }

  await locator.click(options);
}

export const test = base.extend({
  authenticatedPage: async ({ page }, use) => {
    await testUtils.login(page, TEST_ACCOUNTS.ADMIN.email, TEST_ACCOUNTS.ADMIN.password);
    await use(page);
  },

  staffPage: async ({ page }, use) => {
    await testUtils.login(page, TEST_ACCOUNTS.STAFF.email, TEST_ACCOUNTS.STAFF.password);
    await use(page);
  },
});

export const testUtils = {
  async waitForCorrectApp(page: Page, timeoutMs: number = 15_000) {
    await expect
      .poll(async () => {
        try {
          return await page.title();
        } catch {
          return "";
        }
      }, { timeout: timeoutMs })
      .toMatch(/Intersite Track/i);
  },

  async waitForBackendReady(page: Page, timeoutMs: number = 60_000) {
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      try {
        const ready = await page.evaluate(async () => {
          try {
            const response = await fetch("/api/health");
            return response.ok;
          } catch {
            return false;
          }
        });

        if (ready) return;
      } catch {
        // Ignore transient page/context errors while the dev server boots.
      }

      await page.waitForTimeout(1_000);
    }

    throw new Error("Backend API did not become ready in time");
  },

  async hasSessionUser(page: Page) {
    return page.evaluate(() => !!sessionStorage.getItem("user")).catch(() => false);
  },

  async isLoggedIn(page: Page) {
    if (await this.hasSessionUser(page)) return true;

    const hasShellMarker = await page
      .getByRole("button", { name: /เปิดการแจ้งเตือน/ })
      .first()
      .isVisible()
      .catch(() => false);

    if (hasShellMarker) return true;

    return page.getByRole("button", { name: /ออกจากระบบ/ }).isVisible().catch(() => false);
  },

  async getSessionUser(page: Page) {
    return page.evaluate(() => {
      const raw = sessionStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    });
  },

  async waitForAuthenticatedShell(page: Page) {
    await page.waitForFunction(
      () => {
        if (sessionStorage.getItem("user")) return true;

        return !!document.querySelector('[aria-label^="เปิดการแจ้งเตือน"]');
      },
      { timeout: 15_000 }
    );
    await expect(page.getByRole("button", { name: /เปิดการแจ้งเตือน/ }).first()).toBeVisible({
      timeout: 15_000,
    });
  },

  async openSidebar(page: Page) {
    const menuButton = page.locator('button[aria-label="เปิดเมนูหลัก"]:visible').first();
    const closeButton = page.locator('button[aria-label="ปิดเมนูหลัก"]:visible').first();

    if (!(await menuButton.isVisible().catch(() => false))) return;
    if (await closeButton.isVisible().catch(() => false)) return;

    await activate(page, menuButton);
    await expect(closeButton).toBeVisible({ timeout: 10_000 });
  },

  async navigateToTab(page: Page, label: string) {
    let tabButton = page.getByRole("button", { name: label }).first();

    if (!(await tabButton.isVisible().catch(() => false))) {
      await this.openSidebar(page);
      tabButton = page.locator("button:visible").filter({ hasText: label }).first();
    }

    await expect(tabButton).toBeVisible({ timeout: 10_000 });
    await activate(page, tabButton);
  },

  async login(page: Page, email: string, password: string) {
    await page.goto("/");
    await this.waitForCorrectApp(page);
    await this.waitForBackendReady(page);

    if (await this.isLoggedIn(page)) return;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const emailField = page.locator('input[type="email"]');
      const passwordField = page.locator('input[type="password"]');
      const submitButton = page.getByRole("button", { name: "เข้าสู่ระบบ" });

      await expect(emailField).toBeVisible({ timeout: 10_000 });
      await expect(passwordField).toBeVisible({ timeout: 10_000 });
      await emailField.fill(email);
      await passwordField.fill(password);
      await activate(page, submitButton);

      await page
        .waitForFunction(
          () => {
            const pageText = document.body.innerText;
            return (
              !!sessionStorage.getItem("user") ||
              !!document.querySelector('[aria-label^="เปิดการแจ้งเตือน"]') ||
              pageText.includes("ไม่สามารถเริ่มเซสชันความปลอดภัยได้") ||
              pageText.includes("visibility-check-was-unavailable") ||
              pageText.includes("ไม่สามารถตรวจสอบสถานะการแสดงผลได้") ||
              pageText.includes("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้") ||
              pageText.includes("auth/network-request-failed") ||
              pageText.includes("อีเมลหรือรหัสผ่านไม่ถูกต้อง")
            );
          },
          { timeout: 15_000 }
        )
        .catch(() => null);

      if (await this.isLoggedIn(page)) {
        await this.waitForAuthenticatedShell(page);
        return;
      }

      const transientSecurityError = await page
        .getByText("ไม่สามารถเริ่มเซสชันความปลอดภัยได้")
        .isVisible()
        .catch(() => false);

      const transientVisibilityError = await page
        .getByText(/visibility-check-was-unavailable|ไม่สามารถตรวจสอบสถานะการแสดงผลได้/)
        .isVisible()
        .catch(() => false);

      const transientNetworkError = await page
        .getByText(/auth\/network-request-failed|ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้/)
        .isVisible()
        .catch(() => false);

      if ((transientSecurityError || transientVisibilityError || transientNetworkError) && attempt < 2) {
        await this.waitForBackendReady(page);
        if (transientNetworkError) await page.waitForTimeout(1_000 * (attempt + 1));
        await page.reload();
        continue;
      }

      break;
    }

    throw new Error("Login did not complete successfully");
  },

  async logout(page: Page) {
    if (!(await this.isLoggedIn(page))) return;

    await this.openSidebar(page);
    const logoutButton = page.locator("button:visible").filter({ hasText: "ออกจากระบบ" }).first();
    await expect(logoutButton).toBeVisible({ timeout: 10_000 });
    await activate(page, logoutButton);
    await page.waitForFunction(() => !sessionStorage.getItem("user"));
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10_000 });
  },

  async getCsrfToken(page: Page): Promise<string> {
    const token = await getFirebaseToken(page);
    const result = await page.evaluate(async ({ token }) => {
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;

      const response = await fetch("/api/csrf-token", {
        method: "GET",
        headers,
        credentials: "include",
      });
      const payload = await response.json().catch(() => ({}));
      return {
        ok: response.ok,
        token: response.headers.get("X-CSRF-Token") ?? payload.csrfToken ?? null,
      };
    }, { token });

    expect(result.ok).toBeTruthy();
    expect(result.token).toBeTruthy();
    return result.token as string;
  },

  async apiRequest<T = unknown>(
    page: Page,
    options: {
      url: string;
      method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
      body?: unknown;
      headers?: Record<string, string>;
    }
  ): Promise<ApiResponse<T>> {
    const method = options.method ?? "GET";
    const token = await getFirebaseToken(page);
    const csrfToken =
      method === "GET" || method === "HEAD" || method === "OPTIONS"
        ? null
        : await this.getCsrfToken(page);

    const response = await page.evaluate(
      async ({ url, method, body, headers, token, csrfToken }) => {
        const requestHeaders: Record<string, string> = { ...(headers ?? {}) };

        if (token) requestHeaders.Authorization = `Bearer ${token}`;
        if (csrfToken) requestHeaders["x-csrf-token"] = csrfToken;

        let payloadBody: string | undefined;
        if (body !== undefined) {
          requestHeaders["Content-Type"] = "application/json";
          payloadBody = JSON.stringify(body);
        }

        const result = await fetch(url, {
          method,
          headers: requestHeaders,
          body: payloadBody,
          credentials: "include",
        });

        const contentType = result.headers.get("content-type") ?? "";
        const bodyPayload = contentType.includes("application/json")
          ? await result.json().catch(() => null)
          : await result.text().catch(() => null);

        return {
          status: result.status,
          ok: result.ok,
          body: bodyPayload,
          payload:
            bodyPayload &&
            typeof bodyPayload === "object" &&
            "success" in bodyPayload &&
            (bodyPayload as { success?: boolean }).success === true
              ? (bodyPayload as { data?: unknown }).data
              : bodyPayload,
          contentType,
        };
      },
      {
        url: options.url,
        method,
        body: options.body,
        headers: options.headers ?? {},
        token,
        csrfToken,
      }
    );

    return response as ApiResponse<T>;
  },

  async createTask(page: Page, overrides: Record<string, unknown> = {}) {
    const title = `E2E Task ${Date.now()}`;
    const response = await this.apiRequest<{ id: string }>(page, {
      url: "/api/tasks",
      method: "POST",
      body: {
        title,
        description: "Playwright smoke task",
        priority: "medium",
        ...overrides,
      },
    });

    expect(response.status).toBe(201);
    expect(response.payload).toBeTruthy();

    return {
      title,
      taskId: (response.payload as { id: string }).id,
      response,
    };
  },

  async uploadAttachment(
    page: Page,
    taskId: string,
    fileName: string = `e2e-${Date.now()}.png`
  ) {
    const token = await getFirebaseToken(page);
    const csrfToken = await this.getCsrfToken(page);

    const response = await page.evaluate(
      async ({ taskId, fileName, token, csrfToken }) => {
        const pngBase64 =
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO5W6iQAAAAASUVORK5CYII=";
        const bytes = Uint8Array.from(atob(pngBase64), value => value.charCodeAt(0));
        const formData = new FormData();
        formData.append("image", new File([bytes], fileName, { type: "image/png" }));

        const result = await fetch(`/api/tasks/${taskId}/upload`, {
          method: "POST",
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            "x-csrf-token": csrfToken,
          },
          body: formData,
          credentials: "include",
        });

        const body = await result.json().catch(() => null);
        return {
          status: result.status,
          ok: result.ok,
          body,
          payload:
            body &&
            typeof body === "object" &&
            "success" in body &&
            (body as { success?: boolean }).success === true
              ? (body as { data?: unknown }).data
              : body,
          contentType: result.headers.get("content-type") ?? "",
        };
      },
      { taskId, fileName, token, csrfToken }
    );

    return response as ApiResponse<{
      file_id: string;
      download_url: string;
      original_name: string;
    }>;
  },

  async openProfile(page: Page, displayName: string) {
    const profileButton = page.locator("aside button:visible").filter({ hasText: displayName }).first();
    if (!(await profileButton.isVisible().catch(() => false))) {
      await this.openSidebar(page);
    }
    await expect(profileButton).toBeVisible({ timeout: 10_000 });
    await profileButton.click({ force: true });
    await expect(page.getByText("โปรไฟล์")).toBeVisible({ timeout: 10_000 });
  },
};

export { expect };
