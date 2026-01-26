/**
 * Custom Jotai storage that reads from settings.json and falls back to localStorage
 * Writes go to both localStorage and settings.json (dual-write for compatibility)
 */
import { createJSONStorage } from 'jotai/utils'
import { trpcClient } from './trpc'

/**
 * In-memory cache of settings.json values
 * Populated on app initialization from main process
 */
let settingsCache: Record<string, unknown> = {}
let cacheInitialized = false

/**
 * Initialize the settings cache by fetching all settings from main process
 * Should be called early in app startup before atoms are accessed
 */
export async function initializeSettingsCache(): Promise<void> {
  if (cacheInitialized) return

  try {
    const result = await trpcClient.settings.getAll.query()
    settingsCache = result
    cacheInitialized = true
    console.log('[SettingsStorage] Initialized cache with', Object.keys(result).length, 'settings')
  } catch (error) {
    console.error('[SettingsStorage] Failed to load settings from main:', error)
    // Continue with empty cache - fallback to localStorage
    cacheInitialized = true
  }
}

/**
 * Update the local cache when settings change
 * Called after successful writes to main process
 */
function updateCache(key: string, value: unknown): void {
  if (value === null || value === undefined) {
    delete settingsCache[key]
  } else {
    settingsCache[key] = value
  }
}

/**
 * Create a Jotai storage that prioritizes settings.json over localStorage
 *
 * Read order: settings cache -> localStorage -> default
 * Write order: BOTH settings cache + localStorage AND settings.json via tRPC
 *
 * This ensures:
 * - Settings from JSON file override localStorage
 * - UI changes are persisted to both locations
 * - Works offline (localStorage fallback)
 */
export function createSettingsStorage<T>() {
  return createJSONStorage<T>(() => ({
    getItem: (key: string) => {
      // 1. Check settings cache first (from settings.json)
      if (key in settingsCache) {
        try {
          return JSON.stringify(settingsCache[key])
        } catch {
          // Can't stringify - fall through to localStorage
        }
      }

      // 2. Fallback to localStorage
      return localStorage.getItem(key)
    },

    setItem: (key: string, value: string) => {
      // 1. Always update localStorage (fast, local fallback)
      try {
        localStorage.setItem(key, value)
      } catch (e) {
        console.warn(`[SettingsStorage] Failed to save to localStorage for ${key}:`, e)
      }

      // 2. Parse value and update settings cache
      try {
        const parsed = JSON.parse(value)
        updateCache(key, parsed)

        // 3. Write to settings.json via main process (async, non-blocking)
        trpcClient.settings.set
          .mutate({ key, value: parsed })
          .catch((err) => {
            console.error('[SettingsStorage] Failed to write to main:', err)
            // Don't revert cache - localStorage is the source of truth for now
          })
      } catch (e) {
        console.warn('[SettingsStorage] Failed to parse value for main process:', e)
      }
    },

    removeItem: (key: string) => {
      // 1. Remove from localStorage
      localStorage.removeItem(key)

      // 2. Update cache
      delete settingsCache[key]

      // 3. Remove from settings.json via main process (async, non-blocking)
      trpcClient.settings.delete.mutate(key).catch((err) => {
        console.error('[SettingsStorage] Failed to delete from main:', err)
      })
    },
  }))
}

/**
 * Atom with storage that uses settings.json as the primary source
 * Falls back to localStorage for backward compatibility
 *
 * Use this for user preferences and settings that should be:
 * - Overridable via settings.json file
 * - Shared across windows
 * - Persisted to disk
 *
 * @example
 * export const mySettingAtom = atomWithSettingsStorage<boolean>(
 *   "preferences:my-setting",
 *   false,
 *   { getOnInit: true }
 * )
 */
export function atomWithSettingsStorage<T>(
  key: string,
  initialValue: T,
  options?: { getOnInit?: boolean }
) {
  const { atomWithStorage } = require('jotai/utils')
  return atomWithStorage<T>(key, initialValue, createSettingsStorage<T>(), options)
}
