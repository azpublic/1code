/**
 * Shared configuration for the desktop app
 */
const IS_DEV = !!process.env.ELECTRON_RENDERER_URL

/**
 * Get the API base URL
 * DISABLED: 21st.dev API has been disabled for local-only operation
 */
export function getApiUrl(): string {
  throw new Error("21st.dev API is disabled. The app now operates in local-only mode.")
}

/**
 * Check if running in development mode
 */
export function isDev(): boolean {
  return IS_DEV
}
