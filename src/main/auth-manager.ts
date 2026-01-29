import { AuthStore, AuthData, AuthUser } from "./auth-store"
import { app, BrowserWindow } from "electron"
import { AUTH_SERVER_PORT } from "./constants"

// Get API URL - DISABLED: 21st.dev API has been disabled for local-only operation
function getApiBaseUrl(): string {
  throw new Error("21st.dev API is disabled. The app now operates in local-only mode.")
}

export class AuthManager {
  private store: AuthStore
  private refreshTimer?: NodeJS.Timeout
  private isDev: boolean
  private onTokenRefresh?: (authData: AuthData) => void

  constructor(isDev: boolean = false) {
    this.store = new AuthStore(app.getPath("userData"))
    this.isDev = isDev

    // Schedule refresh if already authenticated
    if (this.store.isAuthenticated()) {
      this.scheduleRefresh()
    }
  }

  /**
   * Set callback to be called when token is refreshed
   * This allows the main process to update cookies when tokens change
   */
  setOnTokenRefresh(callback: (authData: AuthData) => void): void {
    this.onTokenRefresh = callback
  }

  private getApiUrl(): string {
    return getApiBaseUrl()
  }

  /**
   * Exchange auth code for session tokens
   * DISABLED: 21st.dev authentication is disabled
   */
  async exchangeCode(code: string): Promise<AuthData> {
    throw new Error("21st.dev authentication is disabled. The app now operates in local-only mode.")
  }

  /**
   * Get device info for session tracking
   */
  private getDeviceInfo(): string {
    const platform = process.platform
    const arch = process.arch
    const version = app.getVersion()
    return `21st Desktop ${version} (${platform} ${arch})`
  }

  /**
   * Get a valid token, refreshing if necessary
   * DISABLED: 21st.dev authentication is disabled
   */
  async getValidToken(): Promise<string | null> {
    return null
  }

  /**
   * Refresh the current session
   * DISABLED: 21st.dev authentication is disabled
   */
  async refresh(): Promise<boolean> {
    throw new Error("21st.dev authentication is disabled. The app now operates in local-only mode.")
  }

  /**
   * Schedule token refresh before expiration
   */
  private scheduleRefresh(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer)
    }

    const authData = this.store.load()
    if (!authData) return

    const expiresAt = new Date(authData.expiresAt).getTime()
    const now = Date.now()

    // Refresh 5 minutes before expiration
    const refreshIn = Math.max(0, expiresAt - now - 5 * 60 * 1000)

    this.refreshTimer = setTimeout(() => {
      this.refresh()
    }, refreshIn)

    console.log(`Scheduled token refresh in ${Math.round(refreshIn / 1000 / 60)} minutes`)
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.store.isAuthenticated()
  }

  /**
   * Get current user
   */
  getUser(): AuthUser | null {
    return this.store.getUser()
  }

  /**
   * Get current auth data
   */
  getAuth(): AuthData | null {
    return this.store.load()
  }

  /**
   * Logout and clear stored credentials
   */
  logout(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer)
      this.refreshTimer = undefined
    }
    this.store.clear()
  }

  /**
   * Start auth flow by opening browser
   * DISABLED: 21st.dev authentication is disabled
   */
  startAuthFlow(mainWindow: BrowserWindow | null): void {
    throw new Error("21st.dev authentication is disabled. The app now operates in local-only mode.")
  }

  /**
   * Update user profile on server and locally
   * DISABLED: 21st.dev authentication is disabled
   */
  async updateUser(updates: { name?: string }): Promise<AuthUser | null> {
    throw new Error("21st.dev authentication is disabled. The app now operates in local-only mode.")
  }

  /**
   * Fetch user's subscription plan from web backend
   * DISABLED: 21st.dev authentication is disabled
   */
  async fetchUserPlan(): Promise<{ email: string; plan: string; status: string | null } | null> {
    return null
  }
}

// Global singleton instance
let authManagerInstance: AuthManager | null = null

/**
 * Initialize the global auth manager instance
 * Must be called once from main process initialization
 */
export function initAuthManager(isDev: boolean = false): AuthManager {
  if (!authManagerInstance) {
    authManagerInstance = new AuthManager(isDev)
  }
  return authManagerInstance
}

/**
 * Get the global auth manager instance
 * Returns null if not initialized
 */
export function getAuthManager(): AuthManager | null {
  return authManagerInstance
}
