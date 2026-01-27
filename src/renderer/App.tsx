import { Provider as JotaiProvider, useAtomValue, useSetAtom } from "jotai"
import { ThemeProvider, useTheme } from "next-themes"
import { useEffect, useMemo, ComponentType } from "react"
import { Toaster } from "sonner"
import { TooltipProvider } from "./components/ui/tooltip"
import { TRPCProvider } from "./contexts/TRPCProvider"
import { WindowProvider, getInitialWindowParams } from "./contexts/WindowContext"
import { selectedProjectAtom, selectedAgentChatIdAtom } from "./features/agents/atoms"
import { useAgentSubChatStore } from "./features/agents/stores/sub-chat-store"
import { AgentsLayout } from "./features/layout/agents-layout"
import {
  AnthropicOnboardingPage,
  ApiKeyOnboardingPage,
  BillingMethodPage,
  SelectRepoPage,
} from "./features/onboarding"
import { identify, initAnalytics, shutdown } from "./lib/analytics"
import {
  agentPermissionLocalModeAtom,
  agentPermissionWorktreeModeAtom,
  anthropicOnboardingCompletedAtom, apiKeyOnboardingCompletedAtom,
  billingMethodAtom,
  defaultWorktreeBaseLocationAtom,
  interviewTimeoutSecondsAtom,
} from "./lib/atoms"
import { appStore } from "./lib/jotai-store"
import { VSCodeThemeProvider } from "./lib/themes/theme-provider"
import { trpc } from "./lib/trpc"
import { initializeSettingsCache } from "./lib/settings-storage"

// Error Boundary to catch React rendering errors
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    console.error("[ErrorBoundary] Caught error:", error)
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ErrorBoundary] Error details:", error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined })
    // Try to reload the page to recover from the error
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen flex items-center justify-center bg-background p-6">
          <div className="max-w-2xl w-full bg-card border border-border rounded-lg shadow-lg p-6">
            <h1 className="text-2xl font-semibold text-destructive mb-4">Something went wrong</h1>
            <p className="text-muted-foreground mb-4">
              An unexpected error occurred. You can try reloading the app or copy the error details below for debugging.
            </p>
            <div className="flex gap-3 mb-4">
              <button
                onClick={this.handleReset}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                Reload App
              </button>
              <button
                onClick={() => {
                  const errorDetails = `${this.state.error?.name}: ${this.state.error?.message}\n\n${this.state.error?.stack || ""}`
                  navigator.clipboard.writeText(errorDetails)
                }}
                className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
              >
                Copy Error
              </button>
              <button
                onClick={async () => {
                  // First unlock DevTools (required in production)
                  await window.desktopApi?.unlockDevTools()
                  // Then open DevTools
                  window.desktopApi?.toggleDevTools()
                }}
                className="px-4 py-2 bg-outline text-outline-foreground rounded-md hover:bg-outline/80 transition-colors"
              >
                Open DevTools
              </button>
            </div>
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                Error Details
              </summary>
              <pre className="mt-2 p-4 bg-muted rounded-md overflow-auto text-xs text-destructive max-h-64">
                {this.state.error?.stack || String(this.state.error)}
              </pre>
            </details>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// Need to import React for the ErrorBoundary
import React from "react"

/**
 * Custom Toaster that adapts to theme
 */
function ThemedToaster() {
  const { resolvedTheme } = useTheme()

  return (
    <Toaster
      position="bottom-right"
      theme={resolvedTheme as "light" | "dark" | "system"}
      closeButton
    />
  )
}

/**
 * Main content router - decides which page to show based on onboarding state
 */
function AppContent() {
  console.log("[AppContent] Rendering AppContent...")

  const billingMethod = useAtomValue(billingMethodAtom)
  const setBillingMethod = useSetAtom(billingMethodAtom)
  const anthropicOnboardingCompleted = useAtomValue(
    anthropicOnboardingCompletedAtom
  )
  const setAnthropicOnboardingCompleted = useSetAtom(anthropicOnboardingCompletedAtom)
  const apiKeyOnboardingCompleted = useAtomValue(apiKeyOnboardingCompletedAtom)
  const setApiKeyOnboardingCompleted = useSetAtom(apiKeyOnboardingCompletedAtom)
  const selectedProject = useAtomValue(selectedProjectAtom)
  const setSelectedChatId = useSetAtom(selectedAgentChatIdAtom)
  const defaultWorktreeBaseLocation = useAtomValue(defaultWorktreeBaseLocationAtom)
  const interviewTimeoutSeconds = useAtomValue(interviewTimeoutSecondsAtom)
  const agentPermissionLocal = useAtomValue(agentPermissionLocalModeAtom)
  const agentPermissionWorktree = useAtomValue(agentPermissionWorktreeModeAtom)
  const { setActiveSubChat, addToOpenSubChats, setChatId } = useAgentSubChatStore()

  // Sync default worktree location and interview timeout to main process on app startup
  const settingsSetMutation = trpc.settings.set.useMutation()
  useEffect(() => {
    const syncSettings = async () => {
      // Sync default worktree location
      if (defaultWorktreeBaseLocation) {
        try {
          await settingsSetMutation.mutateAsync({
            key: "defaultWorktreeBaseLocation",
            value: defaultWorktreeBaseLocation,
          })
          console.log("[App] Synced default worktree location to main process:", defaultWorktreeBaseLocation)
        } catch (error) {
          console.error("[App] Failed to sync default worktree location:", error)
        }
      }
      // Sync interview timeout
      try {
        await settingsSetMutation.mutateAsync({
          key: "interviewTimeoutSeconds",
          value: interviewTimeoutSeconds,
        })
        console.log("[App] Synced interview timeout to main process:", interviewTimeoutSeconds)
      } catch (error) {
        console.error("[App] Failed to sync interview timeout:", error)
      }
      // Sync agent permission settings
      try {
        await Promise.all([
          settingsSetMutation.mutateAsync({
            key: "agentPermissionLocalMode",
            value: agentPermissionLocal,
          }),
          settingsSetMutation.mutateAsync({
            key: "agentPermissionWorktreeMode",
            value: agentPermissionWorktree,
          }),
        ])
        console.log("[App] Synced agent permission settings to main process:", { agentPermissionLocal, agentPermissionWorktree })
      } catch (error) {
        console.error("[App] Failed to sync agent permission settings:", error)
      }
    }
    syncSettings()
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Apply initial window params (chatId/subChatId) when opening via "Open in new window"
  useEffect(() => {
    const params = getInitialWindowParams()
    if (params.chatId) {
      console.log("[App] Opening chat from window params:", params.chatId, params.subChatId)
      setSelectedChatId(params.chatId)
      setChatId(params.chatId)
      if (params.subChatId) {
        addToOpenSubChats(params.subChatId)
        setActiveSubChat(params.subChatId)
      }
    }
  }, [setSelectedChatId, setChatId, addToOpenSubChats, setActiveSubChat])

  // Check if user has existing CLI config (API key or proxy)
  // Based on PR #29 by @sa4hnd
  const { data: cliConfig, isLoading: isLoadingCliConfig } =
    trpc.claudeCode.hasExistingCliConfig.useQuery()

  // Migration: If user already completed Anthropic onboarding but has no billing method set,
  // automatically set it to "claude-subscription" (legacy users before billing method was added)
  useEffect(() => {
    if (!billingMethod && anthropicOnboardingCompleted) {
      setBillingMethod("claude-subscription")
    }
  }, [billingMethod, anthropicOnboardingCompleted, setBillingMethod])

  // Auto-skip onboarding if user has existing CLI config (API key or proxy)
  // This allows users with ANTHROPIC_API_KEY to use the app without OAuth
  useEffect(() => {
    if (cliConfig?.hasConfig && !billingMethod) {
      console.log("[App] Detected existing CLI config, auto-completing onboarding")
      setBillingMethod("api-key")
      setApiKeyOnboardingCompleted(true)
    }
  }, [cliConfig?.hasConfig, billingMethod, setBillingMethod, setApiKeyOnboardingCompleted])

  // Fetch projects to validate selectedProject exists
  const { data: projects, isLoading: isLoadingProjects } =
    trpc.projects.list.useQuery()

  // Validated project - only valid if exists in DB
  const validatedProject = useMemo(() => {
    if (!selectedProject) return null
    // While loading, trust localStorage value to prevent flicker
    if (isLoadingProjects) return selectedProject
    // After loading, validate against DB
    if (!projects) return null
    const exists = projects.some((p) => p.id === selectedProject.id)
    return exists ? selectedProject : null
  }, [selectedProject, projects, isLoadingProjects])

  // Determine which page to show:
  // 1. No billing method selected -> BillingMethodPage
  // 2. Claude subscription selected but not completed -> AnthropicOnboardingPage
  // 3. API key or custom model selected but not completed -> ApiKeyOnboardingPage
  // 4. No valid project selected -> SelectRepoPage
  // 5. Otherwise -> AgentsLayout

  // Debug logging for routing state
  console.log("[DEBUG] App routing state:", {
    billingMethod,
    anthropicOnboardingCompleted,
    apiKeyOnboardingCompleted,
    selectedProject: selectedProject ? { id: selectedProject.id, name: selectedProject.name } : null,
    validatedProject: validatedProject ? { id: validatedProject.id, name: validatedProject.name } : null,
    isLoadingProjects,
    projectsCount: projects?.length,
    nextPage: !billingMethod ? "BillingMethodPage"
      : billingMethod === "claude-subscription" && !anthropicOnboardingCompleted ? "AnthropicOnboardingPage"
      : (billingMethod === "api-key" || billingMethod === "custom-model") && !apiKeyOnboardingCompleted ? "ApiKeyOnboardingPage"
      : !validatedProject && !isLoadingProjects ? "SelectRepoPage"
      : "AgentsLayout"
  })

  if (!billingMethod) {
    return <BillingMethodPage />
  }

  if (billingMethod === "claude-subscription" && !anthropicOnboardingCompleted) {
    return <AnthropicOnboardingPage />
  }

  if (
    (billingMethod === "api-key" || billingMethod === "custom-model") &&
    !apiKeyOnboardingCompleted
  ) {
    return <ApiKeyOnboardingPage />
  }

  if (!validatedProject && !isLoadingProjects) {
    return <SelectRepoPage />
  }

  return <AgentsLayout />
}

export function App() {
  console.log("[App] App component rendering...")

  // Initialize analytics and settings on mount
  useEffect(() => {
    console.log("[App] App component mounted, initializing...")

    // Initialize settings cache from main process (non-blocking)
    initializeSettingsCache().catch((error) => {
      console.warn("[App] Failed to initialize settings cache:", error)
    })

    console.log("[App] Initializing analytics...")
    initAnalytics()
    console.log("[App] Analytics initialized")

    // Sync analytics opt-out status to main process
    const syncOptOutStatus = async () => {
      try {
        const optOut =
          localStorage.getItem("preferences:analytics-opt-out") === "true"
        await window.desktopApi?.setAnalyticsOptOut(optOut)
      } catch (error) {
        console.warn("[Analytics] Failed to sync opt-out status:", error)
      }
    }
    syncOptOutStatus()

    // Identify user if already authenticated
    const identifyUser = async () => {
      try {
        const user = await window.desktopApi?.getUser()
        if (user?.id) {
          identify(user.id, { email: user.email, name: user.name })
        }
      } catch (error) {
        console.warn("[Analytics] Failed to identify user:", error)
      }
    }
    identifyUser()

    console.log("[App] App initialization complete")

    // Cleanup on unmount
    return () => {
      shutdown()
    }
  }, [])

  return (
    <ErrorBoundary>
      <WindowProvider>
        <JotaiProvider store={appStore}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <VSCodeThemeProvider>
              <TooltipProvider delayDuration={100}>
                <TRPCProvider>
                  <div
                    data-agents-page
                    className="h-screen w-screen bg-background text-foreground overflow-hidden"
                  >
                    <AppContent />
                  </div>
                  <ThemedToaster />
                </TRPCProvider>
              </TooltipProvider>
            </VSCodeThemeProvider>
          </ThemeProvider>
        </JotaiProvider>
      </WindowProvider>
    </ErrorBoundary>
  )
}
