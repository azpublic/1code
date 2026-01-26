/**
 * JSON file-based settings manager
 * Stores user preferences in {userData}/settings.json
 * Overrides localStorage values with JSON file values
 */
import { promises as fs } from 'fs'
import { join } from 'path'
import { app } from 'electron'

const SETTINGS_PATH = join(app.getPath('userData'), 'settings.json')

export class SettingsManager {
  private cache: Record<string, unknown> = {}
  private savePromise: Promise<void> | null = null
  private loaded = false

  /**
   * Load settings from disk
   * Creates empty cache if file doesn't exist or is invalid
   */
  async load(): Promise<void> {
    try {
      const data = await fs.readFile(SETTINGS_PATH, 'utf-8')
      this.cache = JSON.parse(data)
      console.log('[Settings] Loaded settings from', SETTINGS_PATH)
    } catch (error) {
      const errorCode = (error as NodeJS.ErrnoException).code
      if (errorCode === 'ENOENT') {
        // File doesn't exist yet - this is expected on first run
        console.log('[Settings] No settings.json found, starting with empty cache')
      } else {
        // File exists but is invalid - backup and start fresh
        console.error('[Settings] Failed to parse settings.json, backing up:', error)
        await fs.rename(SETTINGS_PATH, `${SETTINGS_PATH}.backup.${Date.now()}`).catch(() => {})
      }
      this.cache = {}
    }
    this.loaded = true
  }

  /**
   * Get a single setting value by key
   */
  get(key: string): unknown {
    return this.cache[key]
  }

  /**
   * Get all settings as a plain object
   */
  getAll(): Record<string, unknown> {
    return { ...this.cache }
  }

  /**
   * Set a single setting value
   * Writes are debounced (100ms) to avoid excessive disk I/O
   */
  async set(key: string, value: unknown): Promise<void> {
    this.cache[key] = value
    this.scheduleWrite()
  }

  /**
   * Set multiple settings at once
   * Writes are debounced (100ms) to avoid excessive disk I/O
   */
  async setAll(settings: Record<string, unknown>): Promise<void> {
    this.cache = { ...this.cache, ...settings }
    this.scheduleWrite()
  }

  /**
   * Delete a setting key
   */
  async delete(key: string): Promise<void> {
    delete this.cache[key]
    this.scheduleWrite()
  }

  /**
   * Check if settings have been loaded
   */
  isLoaded(): boolean {
    return this.loaded
  }

  /**
   * Schedule a debounced write to disk
   * Multiple rapid changes will only result in one disk write
   */
  private scheduleWrite(): void {
    if (this.savePromise) {
      return
    }

    this.savePromise = (async () => {
      // Debounce: wait 100ms before writing
      await new Promise((resolve) => setTimeout(resolve, 100))

      try {
        await fs.writeFile(SETTINGS_PATH, JSON.stringify(this.cache, null, 2), 'utf-8')
        console.log('[Settings] Saved settings to', SETTINGS_PATH)
      } catch (error) {
        console.error('[Settings] Failed to write settings.json:', error)
      } finally {
        this.savePromise = null
      }
    })()
  }
}

// Singleton instance
let settingsManagerInstance: SettingsManager | null = null

/**
 * Get the singleton SettingsManager instance
 */
export function getSettingsManager(): SettingsManager {
  if (!settingsManagerInstance) {
    settingsManagerInstance = new SettingsManager()
  }
  return settingsManagerInstance
}

/**
 * Initialize the settings manager by loading from disk
 * Should be called during app startup
 */
export async function initSettingsManager(): Promise<void> {
  const manager = getSettingsManager()
  await manager.load()
}
