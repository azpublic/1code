import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright configuration for Electron E2E tests
 *
 * This config is specifically for testing the 1Code Electron app
 * with isolated test environments.
 */
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.spec.ts', // Only run .spec.ts files (Playwright tests), not .test.ts files (Vitest tests)
  fullyParallel: false, // Electron apps should run tests sequentially
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker for Electron
  reporter: 'html',
  tsconfig: './tsconfig.test.json', // Use test-specific tsconfig

  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 10000,
  },

  projects: [
    {
      name: 'electron',
      use: {
        // Electron-specific config
        // We'll launch Electron manually in tests using _electron
      },
    },
  ],
})
