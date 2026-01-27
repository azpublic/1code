import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright configuration for Electron E2E tests
 *
 * This config is specifically for testing the 1Code Electron app
 * with isolated test environments.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false, // Electron apps should run tests sequentially
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker for Electron
  reporter: 'html',

  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'electron',
      use: {
        // Electron-specific config
        // Note: We'll launch Electron manually in tests
        // This is just a placeholder project
      },
    },
  ],

  // Run local build server before starting the tests
  // webServer: {
  //   command: 'bun run build',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
})
