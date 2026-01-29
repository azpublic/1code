/**
 * tRPC router for app settings
 * Provides CRUD operations for the JSON settings file
 */
import { z } from 'zod'
import { router, publicProcedure } from '../index'
import { getSettingsManager } from '../../settings'
import { dialog, BrowserWindow } from 'electron'

// API request timeout: 30 seconds
const API_TIMEOUT_MS = 30000

/**
 * Test connection to an Anthropic-style API
 */
async function testAnthropicConnection(
  baseUrl: string,
  token: string,
  model: string
): Promise<{ success: true; model: string; details?: string } | { success: false; error: string; details?: string }> {
  console.log('[testAnthropicConnection] Testing Anthropic-style API connection')
  console.log('[testAnthropicConnection] baseUrl:', baseUrl)
  console.log('[testAnthropicConnection] model:', model)
  console.log('[testAnthropicConnection] token:', token ? `${token.slice(0, 10)}...` : 'none')

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS)

  try {
    const url = `${baseUrl}/v1/messages`
    console.log('[testAnthropicConnection] Fetching URL:', url)

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': token,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 1,
        messages: [{ role: 'user', content: 'hi' }],
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    console.log('[testAnthropicConnection] Response status:', response.status)
    console.log('[testAnthropicConnection] Response ok:', response.ok)

    if (!response.ok) {
      const errorText = await response.text()
      console.log('[testAnthropicConnection] Error response body:', errorText)

      let error = `Connection failed (${response.status})`
      let details = errorText

      if (response.status === 401) {
        error = 'Authentication failed'
        details = 'Invalid API token'
      } else if (response.status === 404) {
        error = 'Model not found'
        details = `The model "${model}" does not exist or is not accessible`
      } else if (response.status >= 500) {
        error = 'Server error'
        details = 'The API server is temporarily unavailable'
      }

      return { success: false, error, details }
    }

    const data = await response.json()
    console.log('[testAnthropicConnection] Success response data:', JSON.stringify(data, null, 2))

    return {
      success: true,
      model,
      details: data?.id ? `Request ID: ${data.id}` : undefined,
    }
  } catch (err) {
    clearTimeout(timeoutId)
    console.log('[testAnthropicConnection] Caught error:', err)

    if (err instanceof Error && err.name === 'AbortError') {
      return { success: false, error: 'Connection timed out', details: 'The request took too long to complete' }
    }
    if (err instanceof Error) {
      return { success: false, error: 'Connection failed', details: err.message }
    }
    return { success: false, error: 'Connection failed', details: 'Unknown error' }
  }
}

/**
 * Test connection to an OpenAI-style API
 */
async function testOpenAIConnection(
  baseUrl: string,
  token: string,
  model: string
): Promise<{ success: true; model: string; details?: string } | { success: false; error: string; details?: string }> {
  console.log('[testOpenAIConnection] Testing OpenAI-style API connection')
  console.log('[testOpenAIConnection] baseUrl:', baseUrl)
  console.log('[testOpenAIConnection] model:', model)
  console.log('[testOpenAIConnection] token:', token ? `${token.slice(0, 10)}...` : 'none')

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS)

  try {
    const url = `${baseUrl}/chat/completions`
    console.log('[testOpenAIConnection] Fetching URL:', url)

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'hi' }],
        max_tokens: 1,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    console.log('[testOpenAIConnection] Response status:', response.status)
    console.log('[testOpenAIConnection] Response ok:', response.ok)

    if (!response.ok) {
      const errorText = await response.text()
      console.log('[testOpenAIConnection] Error response body:', errorText)

      let error = `Connection failed (${response.status})`
      let details = errorText

      if (response.status === 401) {
        error = 'Authentication failed'
        details = 'Invalid API key'
      } else if (response.status === 404) {
        error = 'Model not found'
        details = `The model "${model}" does not exist or is not accessible`
      } else if (response.status >= 500) {
        error = 'Server error'
        details = 'The API server is temporarily unavailable'
      }

      return { success: false, error, details }
    }

    const data = await response.json()
    console.log('[testOpenAIConnection] Success response data:', JSON.stringify(data, null, 2))

    return {
      success: true,
      model,
      details: data?.id ? `Request ID: ${data.id}` : undefined,
    }
  } catch (err) {
    clearTimeout(timeoutId)
    console.log('[testOpenAIConnection] Caught error:', err)

    if (err instanceof Error && err.name === 'AbortError') {
      return { success: false, error: 'Connection timed out', details: 'The request took too long to complete' }
    }
    if (err instanceof Error) {
      return { success: false, error: 'Connection failed', details: err.message }
    }
    return { success: false, error: 'Connection failed', details: 'Unknown error' }
  }
}

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

  /**
   * Test model provider connection
   * Validates credentials and connectivity for Anthropic or OpenAI-style APIs
   */
  testModelProvider: publicProcedure
    .input(
      z.object({
        apiFormat: z.enum(['anthropic', 'openai']),
        baseUrl: z.string(),
        token: z.string(),
        // For OpenAI-style: single model
        model: z.string().optional(),
        // For Anthropic-style: three models (at least one required)
        haikuModel: z.string().optional(),
        sonnetModel: z.string().optional(),
        opusModel: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { apiFormat, baseUrl, token, model, haikuModel, sonnetModel, opusModel } = input

      console.log('[testModelProvider] === Test Connection Request ===')
      console.log('[testModelProvider] apiFormat:', apiFormat)
      console.log('[testModelProvider] baseUrl:', baseUrl)
      console.log('[testModelProvider] token:', token ? `${token.slice(0, 10)}...` : 'none')
      console.log('[testModelProvider] model (openai):', model)
      console.log('[testModelProvider] haikuModel:', haikuModel)
      console.log('[testModelProvider] sonnetModel:', sonnetModel)
      console.log('[testModelProvider] opusModel:', opusModel)

      // Determine which model to test
      let modelToTest = model

      if (apiFormat === 'anthropic') {
        // For Anthropic, test the first available model (priority: sonnet > haiku > opus)
        modelToTest = sonnetModel || haikuModel || opusModel || ''
      }

      console.log('[testModelProvider] modelToTest:', modelToTest)

      if (!modelToTest) {
        console.log('[testModelProvider] No model configured, returning error')
        return {
          success: false,
          error: 'No model configured',
          details: apiFormat === 'anthropic'
            ? 'Please configure at least one model (Haiku, Sonnet, or Opus)'
            : 'Please configure a model name',
        }
      }

      // Test connection based on API format
      console.log('[testModelProvider] Calling test function for format:', apiFormat)
      const result = apiFormat === 'anthropic'
        ? await testAnthropicConnection(baseUrl, token, modelToTest)
        : await testOpenAIConnection(baseUrl, token, modelToTest)

      console.log('[testModelProvider] Result:', JSON.stringify(result, null, 2))
      console.log('[testModelProvider] === End Test Connection Request ===')

      return result
    }),
})
