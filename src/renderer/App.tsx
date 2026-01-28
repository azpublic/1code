import React, { useEffect, useMemo, ComponentType } from "react"
import { Provider as JotaiProvider, useAtomValue, useSetAtom } from "jotai"
import { ThemeProvider, useTheme } from "next-themes"
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
// NOTE: We don't block rendering - we just show toasts and log
// This prevents the "black screen of death" from crashing the app
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { errorCount: number; lastErrorTime: number }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { errorCount: 0, lastErrorTime: 0 }
  }

  static getDerivedStateFromError(error: Error) {
    console.error("[ErrorBoundary] Caught error:", error)
    // Don't change rendering state - just return existing state
    return null
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ErrorBoundary] Error details:", error, errorInfo)

    // Rate limit error notifications (max 1 per 5 seconds)
    const now = Date.now()
    if (now - this.state.lastErrorTime < 5000) {
      return
    }

    // Update error tracking
    this.setState({ errorCount: this.state.errorCount + 1, lastErrorTime: now })

    // Show toast notification
    import("sonner").then(({ toast }) => {
      const errorMessage = error?.message || String(error)
      toast.error("Something went wrong", {
        description: errorMessage.length > 100
          ? errorMessage.slice(0, 100) + "..."
          : errorMessage,
        duration: 3000,
        action: {
          label: "Copy",
          onClick: () => {
            const errorDetails = `${error.name}: ${error.message}\n\n${error.stack || ""}\n\nComponent Stack: ${errorInfo.componentStack}`
            navigator.clipboard.writeText(errorDetails)
            toast.success("Copied")
          },
        },
      })
    }).catch(() => {
      console.warn("[ErrorBoundary] Failed to show toast")
    })
  }

  render() {
    // ALWAYS render children - never block the UI
    // This prevents the "black screen of death"
    return this.props.children
  }
}

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
  const billingMethod = useAtomValue(billingMethodAtom)
  const setBillingMethod = useSetAtom(billingMethodAtom)
  const setApiKeyOnboardingCompleted = useSetAtom(apiKeyOnboardingCompletedAtom)

  // FORK: Skip billing method page - always use API key mode
  useEffect(() => {
    if (!billingMethod) {
      console.log("[App] Setting default billing mode to api-key (fork)")
      setBillingMethod("api-key")
      setApiKeyOnboardingCompleted(true)
    }
    // Only run once on mount - eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const anthropicOnboardingCompleted = useAtomValue(
    anthropicOnboardingCompletedAtom
  )
  const setAnthropicOnboardingCompleted = useSetAtom(anthropicOnboardingCompletedAtom)
  const apiKeyOnboardingCompleted = useAtomValue(apiKeyOnboardingCompletedAtom)
  const selectedProject = useAtomValue(selectedProjectAtom)
  const setSelectedChatId = useSetAtom(selectedAgentChatIdAtom)
  const defaultWorktreeBaseLocation = useAtomValue(defaultWorktreeBaseLocationAtom)
  const interviewTimeoutSeconds = useAtomValue(interviewTimeoutSecondsAtom)
  const agentPermissionLocal = useAtomValue(agentPermissionLocalModeAtom)
  const agentPermissionWorktree = useAtomValue(agentPermissionWorktreeModeAtom)
  const setActiveSubChat = useAgentSubChatStore((s) => s.setActiveSubChat)
  const addToOpenSubChats = useAgentSubChatStore((s) => s.addToOpenSubChats)
  const setChatId = useAgentSubChatStore((s) => s.setChatId)

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
