import { defineConfig, devices } from '@playwright/test'

/**
 * End-to-end tests against a running app (specs/FRONTEND.md §9). Usually the production image:
 *   docker compose --profile app up -d --build      (repo root)
 *   E2E_OWNER_EMAIL=… E2E_OWNER_PASSWORD=… npm run e2e
 * E2E_BASE_URL defaults to http://localhost:8080 (the image); use http://localhost:5173 for the dev server.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // the tests share one owner account
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:8080',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'phone', use: { ...devices['Pixel 7'] }, testMatch: /catalog\.spec\.ts/ },
  ],
})
