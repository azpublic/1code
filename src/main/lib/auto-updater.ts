import { BrowserWindow, ipcMain, app } from "electron"
import log from "electron-log"
import { autoUpdater, type UpdateInfo, type ProgressInfo } from "electron-updater"
import { readFileSync, writeFileSync, existsSync } from "fs"
import { join } from "path"

/**
 * IMPORTANT: Do NOT use lazy/dynamic imports for electron-updater!
 *
 * In v0.0.6 we tried using async getAutoUpdater() with dynamic imports,
 * which broke the auto-updater completely. The synchronous import is required
 * for electron-updater to work correctly.
 *
 * See commit d946614c5 for the broken implementation - do not repeat this mistake.
 */

function initAutoUpdaterConfig() {
  // Configure logging
  log.transports.file.level = "info"
  autoUpdater.logger = log

  // Configure updater behavior
  autoUpdater.autoDownload = false // Let user decide when to download
  autoUpdater.autoInstallOnAppQuit = true // Install on quit if downloaded
  autoUpdater.autoRunAppAfterInstall = true // Restart app after install
}

// CDN base URL for updates
// DISABLED: 21st.dev CDN updates have been disabled for local-only operation
const CDN_BASE = ""

// Minimum interval between update checks (prevent spam on rapid focus/blur)
const MIN_CHECK_INTERVAL = 60 * 1000 // 1 minute
let lastCheckTime = 0

// Auto-update check enabled state (user preference)
let autoUpdateCheckEnabled = false

// Update channel preference file
const CHANNEL_PREF_FILE = "update-channel.json"

type UpdateChannel = "latest" | "beta"

function getChannelPrefPath(): string {
  return join(app.getPath("userData"), CHANNEL_PREF_FILE)
}

function getSavedChannel(): UpdateChannel {
  try {
    const prefPath = getChannelPrefPath()
    if (existsSync(prefPath)) {
      const data = JSON.parse(readFileSync(prefPath, "utf-8"))
      if (data.channel === "beta" || data.channel === "latest") {
        return data.channel
      }
    }
  } catch {
    // Ignore read errors, fall back to default
  }
  return "latest"
}

function saveChannel(channel: UpdateChannel): void {
  try {
    writeFileSync(getChannelPrefPath(), JSON.stringify({ channel }), "utf-8")
  } catch (error) {
    log.error("[AutoUpdater] Failed to save channel preference:", error)
  }
}

let getAllWindows: (() => BrowserWindow[]) | null = null

/**
 * Send update event to all renderer windows
 * Update events are app-wide and should be visible in all windows
 */
function sendToAllRenderers(channel: string, data?: unknown) {
  const windows = getAllWindows?.() ?? BrowserWindow.getAllWindows()
  for (const win of windows) {
    try {
      if (win && !win.isDestroyed()) {
        win.webContents.send(channel, data)
      }
    } catch {
      // Window may have been destroyed between check and send
    }
  }
}

/**
 * Initialize the auto-updater with event handlers and IPC
 * DISABLED: 21st.dev auto-updater has been disabled for local-only operation
 */
export async function initAutoUpdater(getWindows: () => BrowserWindow[]) {
  getAllWindows = getWindows

  // Initialize config
  initAutoUpdaterConfig()

  // Auto-updater disabled - app now operates in local-only mode
  log.info("[AutoUpdater] Auto-updater disabled - app operates in local-only mode")

  // Register IPC handlers (for operations that will fail gracefully)
  registerIpcHandlers()
}

/**
 * Register IPC handlers for update operations
 * DISABLED: All operations will fail gracefully with messages
 */
function registerIpcHandlers() {
  // Check for updates - disabled, returns null
  ipcMain.handle("update:check", async (_event, _force?: boolean) => {
    log.info("[AutoUpdater] Auto-updater disabled - skipping update check")
    return null
  })

  // Download update - disabled, returns false
  ipcMain.handle("update:download", async () => {
    log.info("[AutoUpdater] Auto-updater disabled - cannot download update")
    return false
  })

  // Install update and restart - disabled, does nothing
  ipcMain.handle("update:install", () => {
    log.info("[AutoUpdater] Auto-updater disabled - cannot install update")
  })

  // Get current update state
  ipcMain.handle("update:get-state", () => {
    return {
      currentVersion: app.getVersion(),
      autoUpdateCheckEnabled: false, // Always false since disabled
    }
  })

  // Set auto-update check enabled state - no-op since disabled
  ipcMain.handle("update:set-auto-check", () => {
    // Silently ignore - auto-updater is disabled
    return { success: false, enabled: false }
  })

  // Get auto-update check enabled state - always false
  ipcMain.handle("update:get-auto-check", () => {
    return false
  })
}

/**
 * Manually trigger an update check
 * DISABLED: 21st.dev auto-updater has been disabled for local-only operation
 * @param force - Skip the minimum interval check
 */
export async function checkForUpdates(_force = false) {
  log.info("[AutoUpdater] Auto-updater disabled - skipping update check")
  return Promise.resolve(null)
}

/**
 * Start downloading the update
 * DISABLED: 21st.dev auto-updater has been disabled for local-only operation
 */
export async function downloadUpdate() {
  log.info("[AutoUpdater] Auto-updater disabled - cannot download update")
  return false
}

/**
 * Check for updates when window gains focus
 * DISABLED: 21st.dev auto-updater has been disabled for local-only operation
 */
export function setupFocusUpdateCheck(_getWindows: () => BrowserWindow[]) {
  // Auto-updater disabled - app now operates in local-only mode
  log.info("[AutoUpdater] Auto-updater disabled - skipping focus update check")
}

/**
 * Format bytes to human readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
}
