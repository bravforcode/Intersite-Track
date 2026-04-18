/**
 * Playwright Configuration for E2E Tests
 * Install: npm install --save-dev @playwright/test
 * Run: npx playwright test
 */

import { defineConfig, devices } from "@playwright/test";

const useE2eMock = (process.env.E2E_MOCK ?? (process.env.CI ? "1" : "0")) === "1";
const frontendPort = Number(
  process.env.PLAYWRIGHT_FRONTEND_PORT ?? (useE2eMock ? "5174" : "4173")
);
const backendPort = Number(process.env.PLAYWRIGHT_BACKEND_PORT ?? "3694");

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 90 * 1000,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ["html", { outputFolder: "playwright-report" }],
    ["json", { outputFile: "test-results/e2e.json" }],
    ["junit", { outputFile: "test-results/e2e-junit.xml" }],
  ],
  use: {
    baseURL: process.env.BASE_URL || `http://localhost:${frontendPort}`,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: [
    {
      command: useE2eMock
        ? `npx cross-env E2E_MOCK=1 NODE_ENV=test PORT=${backendPort} npm run start --workspace=backend`
        : `npx cross-env PORT=${backendPort} npm run start --workspace=backend`,
      url: `http://localhost:${backendPort}/api/live`,
      name: "Backend",
      reuseExistingServer: !process.env.CI && !useE2eMock && backendPort === 3694,
      timeout: 240 * 1000,
    },
    {
      command: useE2eMock
        ? `npx cross-env VITE_E2E_MOCK=1 npm run dev --workspace=frontend -- --port ${frontendPort} --strictPort`
        : `npm run dev --workspace=frontend -- --port ${frontendPort} --strictPort`,
      url: `http://localhost:${frontendPort}`,
      name: "Frontend",
      reuseExistingServer: !process.env.CI && !useE2eMock && frontendPort === 4173,
      timeout: 120 * 1000,
    },
  ],
  projects: useE2eMock
    ? [
        {
          name: "chromium",
          use: { ...devices["Desktop Chrome"] },
        },
      ]
    : [
        {
          name: "chromium",
          use: { ...devices["Desktop Chrome"] },
        },
        {
          name: "firefox",
          use: { ...devices["Desktop Firefox"] },
        },
        {
          name: "webkit",
          use: { ...devices["Desktop Safari"] },
        },
        {
          name: "Mobile Chrome",
          use: { ...devices["Pixel 5"] },
        },
        {
          name: "Mobile Safari",
          use: { ...devices["iPhone 12"] },
        },
      ],
});
