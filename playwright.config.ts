import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  // Specs share one local database and the plan engine reads the whole public catalog.
  workers: 1,
  globalSetup: "./e2e/global-setup.ts",
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    ...devices["iPhone 13"],
    // iPhone preset defaults to WebKit; Chromium is enough for flow coverage.
    browserName: "chromium",
    trace: "retain-on-failure",
  },
  webServer: {
    command: process.env.CI ? "bun run build && bun run start" : "bun run dev",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
