/**
 * Playwright configuration for G_Dashboard (VSCode Extension)
 *
 * Since VSCode extensions run inside the host editor, not in a browser,
 * we test webview components by extracting their HTML and serving it
 * via a lightweight static server. Playwright then navigates to that
 * served HTML to validate rendering and interactions.
 *
 * @see https://playwright.dev/docs/test-configuration
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'html' : 'list',

  use: {
    /* The webview HTML is served on this local port by the test fixture */
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
