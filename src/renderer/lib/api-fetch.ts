/**
 * API fetch helper for desktop app
 * DISABLED: 21st.dev API has been disabled for local-only operation
 */

/**
 * Get the API base URL
 * DISABLED: 21st.dev API has been disabled for local-only operation
 */
export async function getApiBaseUrl(): Promise<string> {
  throw new Error("21st.dev API is disabled. The app now operates in local-only mode.")
}

/**
 * Fetch wrapper that uses the correct API base URL
 * DISABLED: 21st.dev API has been disabled for local-only operation
 *
 * @param path - API path (e.g., "/api/tts")
 * @param init - Fetch init options
 * @param options.withCredentials - Include credentials (default: false)
 */
export async function apiFetch(
  path: string,
  init?: RequestInit,
  options?: { withCredentials?: boolean }
): Promise<Response> {
  throw new Error("21st.dev API is disabled. The app now operates in local-only mode.")
}
