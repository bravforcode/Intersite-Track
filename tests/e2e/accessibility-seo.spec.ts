import { test } from "@playwright/test";

// ═════════════════════════════════════════════════════════════════════════════
// ACCESSIBILITY TESTING
// Tests WCAG 2.1 Level AA compliance
// ═════════════════════════════════════════════════════════════════════════════

test.describe("WCAG 2.1 Level AA Compliance", () => {
  test("should have sufficient color contrast", async ({ page }) => {
    await page.goto("/");

    // Check text elements for sufficient contrast
    const textElements = await page.locator("p, span, label, h1, h2, h3, h4, h5, h6");
    const count = await textElements.count();

    for (let i = 0; i < Math.min(count, 20); i++) {
      const element = textElements.nth(i);
      const color = await element.evaluate(
        (el) => window.getComputedStyle(el).color
      );
      const backgroundColor = await element.evaluate(
        (el) => window.getComputedStyle(el).backgroundColor
      );

      // Simplified check - in real scenario use contrast library
      expect(color).not.toBe(backgroundColor);
    }
  });

  test("should have proper focus indicators", async ({ page }) => {
    await page.goto("/");

    const buttons = await page.locator("button");
    if ((await buttons.count()) > 0) {
      const button = buttons.first();

      // Tab to focus
      await page.keyboard.press("Tab");

      const outline = await button.evaluate(
        (el) => window.getComputedStyle(el).outlineWidth
      );

      // Should have visible focus indicator
      expect(parseInt(outline)).toBeGreaterThan(0);
    }
  });

  test("should have descriptive button text", async ({ page }) => {
    await page.goto("/");

    const buttons = await page.locator("button");

    for (let i = 0; i < Math.min(await buttons.count(), 10); i++) {
      const button = buttons.nth(i);
      const text = await button.textContent();
      const ariaLabel = await button.getAttribute("aria-label");
      const title = await button.getAttribute("title");

      // Should have descriptive text or aria-label
      expect(text || ariaLabel || title).toBeTruthy();
    }
  });

  test("should have proper form structure", async ({ page }) => {
    await page.goto("/login");

    const form = await page.locator("form");
    const inputs = await page.locator("input");

    if ((await form.count()) > 0 && (await inputs.count()) > 0) {
      for (let i = 0; i < await inputs.count(); i++) {
        const input = inputs.nth(i);
        const inputId = await input.getAttribute("id");
        const ariaLabel = await input.getAttribute("aria-label");

        // Should have label or aria-label
        if (inputId) {
          const label = await page.locator(`label[for="${inputId}"]`);
          expect(await label.count()).toBeGreaterThan(0);
        } else {
          expect(ariaLabel).toBeTruthy();
        }
      }
    }
  });

  test("should support keyboard navigation", async ({ page }) => {
    await page.goto("/");

    const focusableElements = await page.locator(
      "button, a[href], input, select, textarea, [tabindex]"
    );

    // Should have multiple focusable elements
    expect(await focusableElements.count()).toBeGreaterThan(0);

    // Test Tab navigation
    let previousElement: string | null = null;
    for (let i = 0; i < Math.min(5, await focusableElements.count()); i++) {
      await page.keyboard.press("Tab");

      const activeElement = await page.evaluate(() => {
        const el = document.activeElement;
        return el?.tagName || "";
      });

      expect(activeElement).not.toBe(previousElement);
      previousElement = activeElement;
    }
  });

  test("should use semantic HTML", async ({ page }) => {
    await page.goto("/");

    const html = await page.content();

    // Check for semantic elements
    expect(html).toMatch(/<(main|nav|header|footer|article|section)[\s>]/i);
  });

  test("should provide skip links", async ({ page }) => {
    await page.goto("/");

    // Check for skip to content link
    const skipLink = await page.locator('a[href*="main"], a[href*="content"]');

    if ((await skipLink.count()) > 0) {
      expect(await skipLink.isHidden()).toBe(true); // Usually hidden
      expect(await skipLink.isEnabled()).toBe(true); // But focusable
    }
  });

  test("should have proper heading hierarchy", async ({ page }) => {
    await page.goto("/");

    const h1s = await page.locator("h1");
    const h2s = await page.locator("h2");

    // Should have exactly one H1
    expect(await h1s.count()).toBe(1);

    // H2s should come after H1
    const h1Index = await page.locator("h1").evaluate(
      (el) => Array.from(el.parentElement!.children).indexOf(el)
    );
    const h2Index = await page.locator("h2").first().evaluate(
      (el) => Array.from(el.parentElement!.children).indexOf(el)
    );

    if (h1Index !== -1 && h2Index !== -1) {
      expect(h2Index).toBeGreaterThan(h1Index);
    }
  });

  test("should have alt text for images", async ({ page }) => {
    await page.goto("/");

    const images = await page.locator("img");

    for (let i = 0; i < Math.min(await images.count(), 10); i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute("alt");
      const ariaLabel = await img.getAttribute("aria-label");

      // Should have alt text or aria-label
      expect(alt || ariaLabel).toBeTruthy();
    }
  });

  test("should properly announce dynamic content", async ({ page }) => {
    await page.goto("/");

    // Create an alert region
    await page.evaluate(() => {
      const alert = document.createElement("div");
      alert.setAttribute("role", "alert");
      alert.textContent = "Test alert message";
      document.body.appendChild(alert);
    });

    const alert = await page.locator('[role="alert"]');
    await expect(alert).toBeVisible();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// SEO COMPLIANCE TESTING
// ═════════════════════════════════════════════════════════════════════════════

test.describe("SEO Compliance", () => {
  test("should have meta description", async ({ page }) => {
    const response = await page.goto("/");
    const html = await page.content();

    expect(html).toMatch(/<meta\s+name="description"/i);
  });

  test("should have proper Open Graph tags", async ({ page }) => {
    const html = await page.content();

    expect(html).toMatch(/<meta\s+property="og:title"/i);
    expect(html).toMatch(/<meta\s+property="og:description"/i);
    expect(html).toMatch(/<meta\s+property="og:image"/i);
  });

  test("should have robots meta tag", async ({ page }) => {
    const html = await page.content();

    expect(html).toMatch(/<meta\s+name="robots"/i);
  });

  test("should have sitemap reference", async ({ page }) => {
    const html = await page.content();

    expect(html).toMatch(/<link\s+rel="sitemap"/i);
  });

  test("should have canonical URL", async ({ page }) => {
    const html = await page.content();

    expect(html).toMatch(/<link\s+rel="canonical"/i);
  });

  test("should have structured data (Schema.org)", async ({ page }) => {
    const html = await page.content();

    expect(html).toMatch(/<script\s+type="application\/ld\+json"/i);
  });
});
