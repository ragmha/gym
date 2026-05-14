import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [['github'], ['list'], ['html', { open: 'never' }]]
    : 'html',
  outputDir: 'test-results',
  use: {
    /* Expo web dev server */
    baseURL: 'http://localhost:8081',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 14'] },
    },
  ],
  /* Start Expo web server before running tests */
  webServer: {
    command: 'bunx expo start --web --port 8081',
    url: 'http://localhost:8081',
    reuseExistingServer: !process.env.CI,
    timeout: process.env.CI ? 300_000 : 120_000,
  },
})
