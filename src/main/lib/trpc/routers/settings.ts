/**
 * tRPC router for app settings
 * Provides CRUD operations for the JSON settings file
 */
import { z } from 'zod'
import { router, publicProcedure } from '../index'
import { getSettingsManager } from '../../settings'
import { dialog, BrowserWindow } from 'electron'

export const settingsRouter = router({
  /**
   * Get a single setting value by key
   */
  get: publicProcedure
    .input(z.string())
    .query(({ input }) => {
      return getSettingsManager().get(input)
    }),

  /**
   * Get all settings as a plain object
   */
  getAll: publicProcedure.query(() => {
    return getSettingsManager().getAll()
  }),

  /**
   * Set a single setting value
   */
  set: publicProcedure
    .input(
      z.object({
        key: z.string(),
        value: z.unknown(),
      })
    )
    .mutation(async ({ input }) => {
      await getSettingsManager().set(input.key, input.value)
      return { success: true }
    }),

  /**
   * Set multiple settings at once
   */
  setMany: publicProcedure
    .input(z.record(z.string(), z.unknown()))
    .mutation(async ({ input }) => {
      await getSettingsManager().setAll(input)
      return { success: true }
    }),

  /**
   * Delete a setting key
   */
  delete: publicProcedure
    .input(z.string())
    .mutation(async ({ input }) => {
      await getSettingsManager().delete(input)
      return { success: true }
    }),

  /**
   * Open folder picker dialog and return selected path
   */
  selectFolder: publicProcedure.mutation(async () => {
    const window = BrowserWindow.getFocusedWindow()
    if (!window) {
      throw new Error('No focused window')
    }

    // Ensure window is focused before showing dialog
    if (!window.isFocused()) {
      window.focus()
      // Small delay to ensure focus is applied by the OS
      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    const result = await dialog.showOpenDialog(window, {
      properties: ['openDirectory', 'createDirectory'],
      title: 'Select Folder',
      buttonLabel: 'Select',
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    return result.filePaths[0]!
  }),
})
