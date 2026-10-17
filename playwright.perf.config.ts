import { defineConfig, devices } from "@playwright/test";

// Production build timings: bunx playwright test -c playwright.perf.config.ts
export default defineConfig({
  testDir: "e2e/perf",
  testMatch: process.env.PERF_TEST ?? "**/*.perf.ts",
  workers: 1,
  globalSetup: "./e2e/global-setup.ts",
  use: { baseURL: "http://localhost:3100", ...devices["iPhone 13"], browserName: "chromium" },
  webServer: { command: "bun run build && bun run start --port 3100", url: "http://localhost:3100", reuseExistingServer: false, timeout: 300_000 },
});
