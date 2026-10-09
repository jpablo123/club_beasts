import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      name: "api",
      command: "node tests/e2e/start-api-e2e.mjs",
      url: "http://localhost:3001/health",
      reuseExistingServer: false,
      timeout: 120000,
    },
    {
      name: "web",
      command: "npm run dev",
      url: "http://localhost:3000",
      reuseExistingServer: false,
      timeout: 120000,
      env: {
        NEXT_PUBLIC_API_URL: "http://localhost:3001",
        NEXTAUTH_SECRET: "playwright-e2e-nextauth-secret",
        NEXTAUTH_URL: "http://localhost:3000",
      },
    },
  ],
});
