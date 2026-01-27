import { test, expect } from '@playwright/test'
import { _electron as electron, ElectronApplication } from 'playwright'

/**
 * E2E Tests for Agent Permission Settings
 *
 * These tests verify:
 * 1. The Electron app can launch successfully
 * 2. Windows are created and load correctly
 * 3. The app structure is intact
 *
 * Note: Detailed permission logic tests are in the Vitest suite.
 * These Playwright tests focus on the full app integration.
 */

test.describe('E2E: Electron App Smoke Tests', () => {
  let electronApp: ElectronApplication

  test.afterEach(async () => {
    if (electronApp) {
      await electronApp.close()
    }
  })

  test('should launch the Electron app and create a window', async () => {
    electronApp = await electron.launch({
      executablePath: require('electron'),
      args: ['out/main/index.js'],
    })

    // Get the first window
    const window = await electronApp.firstWindow()

    // Verify the window exists and has loaded
    expect(await window.evaluate(() => document.title)).toBeTruthy()
  })

  test('should load the login page', async () => {
    electronApp = await electron.launch({
      executablePath: require('electron'),
      args: ['out/main/index.js'],
    })

    // Get the first window
    const window = await electronApp.firstWindow()

    // Wait for the window to load the login page
    await expect(window).toHaveURL(/login\.html/)

    // Verify the page has loaded
    const title = await window.title()
    expect(title).toBeTruthy()
  })

  test('should have proper app structure', async () => {
    electronApp = await electron.launch({
      executablePath: require('electron'),
      args: ['out/main/index.js'],
    })

    // Get the first window
    const window = await electronApp.firstWindow()

    // Verify the window has proper structure
    const body = await window.locator('body')
    await expect(body).toBeVisible()
  })
})
