import { defineConfig, devices } from "@playwright/test";

// Run through `npm run test:e2e`, which prepares the database and build.
export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  timeout: 60_000,
  use: { baseURL: "http://localhost:3200", trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /public\.spec\.ts/ },
  ],
  webServer: {
    command: "node node_modules/next/dist/bin/next start -p 3200",
    url: "http://localhost:3200/api/health",
    timeout: 120_000,
    reuseExistingServer: false,
  },
});
