import { useAtom, useSetAtom } from "jotai"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import {
  activeProfileIdAtom,
  agentsSettingsDialogOpenAtom,
  appTaskProviderIdAtom,
  modelProfilesAtom,
  openaiApiKeyAtom,
  defaultClaudeModelIdAtom,
} from "../../../lib/atoms"
import { trpc } from "../../../lib/trpc"
import { Badge } from "../../ui/badge"
import { Button } from "../../ui/button"
import { Input } from "../../ui/input"
import { Label } from "../../ui/label"
import { ModelProfilesList } from "./model-profiles-list"

// Hook to detect narrow screen
function useIsNarrowScreen(): boolean {
  const [isNarrow, setIsNarrow] = useState(false)

  useEffect(() => {
    const checkWidth = () => {
      setIsNarrow(window.innerWidth <= 768)
    }

    checkWidth()
    window.addEventListener("resize", checkWidth)
    return () => window.removeEventListener("resize", checkWidth)
  }, [])

  return isNarrow
}

export function AgentsModelsTab() {
  const setSettingsOpen = useSetAtom(agentsSettingsDialogOpenAtom)
  const isNarrowScreen = useIsNarrowScreen()

  // OpenAI API key state
  const [storedOpenAIKey, setStoredOpenAIKey] = useAtom(openaiApiKeyAtom)
  const [openaiKey, setOpenaiKey] = useState(storedOpenAIKey)
  const setOpenAIKeyMutation = trpc.voice.setOpenAIKey.useMutation()
  const trpcUtils = trpc.useUtils()

  // Model profiles state
  const [modelProfiles, setModelProfiles] = useAtom(modelProfilesAtom)
  const [activeProfileId, setActiveProfileId] = useAtom(activeProfileIdAtom)
  const [defaultClaudeModelId, setDefaultClaudeModelId] = useAtom(defaultClaudeModelIdAtom)
  const [appTaskProviderId, setAppTaskProviderId] = useAtom(appTaskProviderIdAtom)

  // Legacy config migration (one-time)
  useEffect(() => {
    const legacyKey = "agents:claude-custom-config"
    const legacyConfigStr = localStorage.getItem(legacyKey)

    if (legacyConfigStr) {
      try {
        const legacyConfig = JSON.parse(legacyConfigStr)
        const { model, token, baseUrl } = legacyConfig

        // Only migrate if config has meaningful values
        if (model?.trim() && token?.trim() && baseUrl?.trim()) {
          // Check if a profile with this config already exists
          const exists = modelProfiles.some(
            (p) =>
              p.config.model === model &&
              p.config.token === token &&
              p.config.baseUrl === baseUrl
          )

          if (!exists) {
            const migratedProfile: typeof modelProfiles extends (infer T)[] ? T : never = {
              id: `profile-${Date.now()}`,
              name: "Legacy Config",
              apiFormat: baseUrl.includes("anthropic") ? "anthropic" : "openai",
              config: { model, token, baseUrl },
            }
            setModelProfiles((prev) => [...prev, migratedProfile])
            toast.success("Migrated legacy config to model profile")
          }

          // Clear legacy config after migration
          localStorage.removeItem(legacyKey)
        }
      } catch (e) {
        console.error("Failed to migrate legacy config:", e)
      }
    }
  }, [modelProfiles, setModelProfiles])

  useEffect(() => {
    setOpenaiKey(storedOpenAIKey)
  }, [storedOpenAIKey])

  // OpenAI key handlers
  const trimmedOpenAIKey = openaiKey.trim()
  const canSaveOpenAI = trimmedOpenAIKey !== storedOpenAIKey
  const canResetOpenAI = !!trimmedOpenAIKey

  const handleSaveOpenAI = async () => {
    if (trimmedOpenAIKey && !trimmedOpenAIKey.startsWith("sk-")) {
      toast.error("Invalid OpenAI API key format. Key should start with 'sk-'")
      return
    }

    try {
      await setOpenAIKeyMutation.mutateAsync({ key: trimmedOpenAIKey })
      setStoredOpenAIKey(trimmedOpenAIKey)
      // Invalidate voice availability check
      await trpcUtils.voice.isAvailable.invalidate()
      toast.success("OpenAI API key saved")
    } catch (err) {
      toast.error("Failed to save OpenAI API key")
    }
  }

  const handleResetOpenAI = async () => {
    try {
      await setOpenAIKeyMutation.mutateAsync({ key: "" })
      setStoredOpenAIKey("")
      setOpenaiKey("")
      await trpcUtils.voice.isAvailable.invalidate()
      toast.success("OpenAI API key removed")
    } catch (err) {
      toast.error("Failed to remove OpenAI API key")
    }
  }

  // Filter profiles for different sections
  const anthropicProfiles = modelProfiles.filter((p) => p.apiFormat === "anthropic")
  const openaiProfiles = modelProfiles.filter((p) => p.apiFormat === "openai")

  return (
    <div className="p-6 space-y-6">
      {/* Header - hidden on narrow screens since it's in the navigation bar */}
      {!isNarrowScreen && (
        <div className="flex flex-col space-y-1.5 text-center sm:text-left">
          <h3 className="text-sm font-semibold text-foreground">Models</h3>
          <p className="text-xs text-muted-foreground">
            Configure AI model providers and API keys
          </p>
        </div>
      )}

      {/* Model Profiles Section */}
      <div className="space-y-2">
        <div className="pb-2">
          <h4 className="text-sm font-medium text-foreground">
            Model Profiles
          </h4>
          <p className="text-xs text-muted-foreground">
            Configure multiple AI providers (Anthropic or OpenAI-compatible)
          </p>
        </div>
        <ModelProfilesList
          activeProfileId={activeProfileId}
          defaultClaudeModelId={defaultClaudeModelId}
          onSetActive={setActiveProfileId}
          onSetDefault={setDefaultClaudeModelId}
        />
      </div>

      {/* Default Claude Model Section */}
      {anthropicProfiles.length > 0 && (
        <div className="space-y-2">
          <div className="pb-2">
            <h4 className="text-sm font-medium text-foreground">
              Default Claude Model
            </h4>
            <p className="text-xs text-muted-foreground">
              Select which Anthropic-format model to use for Claude SDK chat
            </p>
          </div>
          <div className="bg-background rounded-lg border border-border overflow-hidden">
            <div className="p-4 space-y-2">
              <button
                onClick={() => setDefaultClaudeModelId(null)}
                className={`w-full flex items-center gap-3 p-2 rounded-md transition-colors ${
                  !defaultClaudeModelId
                    ? "bg-muted"
                    : "hover:bg-muted/50"
                }`}
              >
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  !defaultClaudeModelId
                    ? "border-primary bg-primary"
                    : "border-border"
                }`}>
                  {!defaultClaudeModelId && (
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  )}
                </div>
                <span className="text-sm">Use Claude Code default</span>
              </button>
              {anthropicProfiles.map((profile) => (
                <button
                  key={profile.id}
                  onClick={() => setDefaultClaudeModelId(profile.id)}
                  className={`w-full flex items-center gap-3 p-2 rounded-md transition-colors ${
                    defaultClaudeModelId === profile.id
                      ? "bg-muted"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    defaultClaudeModelId === profile.id
                      ? "border-primary bg-primary"
                      : "border-border"
                  }`}>
                    {defaultClaudeModelId === profile.id && (
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{profile.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        Anthropic
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">{profile.config.model}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* APP TASK AI Provider Section */}
      <div className="space-y-2">
        <div className="pb-2">
          <h4 className="text-sm font-medium text-foreground">
            App Task AI Provider
          </h4>
          <p className="text-xs text-muted-foreground">
            Model used for generating chat names and commit messages (OpenAI-compatible only)
          </p>
        </div>
        <div className="bg-background rounded-lg border border-border overflow-hidden">
          <div className="p-4">
            {openaiProfiles.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No OpenAI-compatible models configured. Add an OpenAI-format model profile above.
              </p>
            ) : (
              <>
                <select
                  value={appTaskProviderId || ""}
                  onChange={(e) => setAppTaskProviderId(e.target.value || null)}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Use Active Profile (if OpenAI-compatible)</option>
                  {openaiProfiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground mt-2">
                  {appTaskProviderId
                    ? `Using: ${modelProfiles.find(p => p.id === appTaskProviderId)?.name || "Unknown"} (OpenAI)`
                    : activeProfileId && modelProfiles.find(p => p.id === activeProfileId)?.apiFormat === "openai"
                      ? `Using active profile: ${modelProfiles.find(p => p.id === activeProfileId)?.name || "Unknown"}`
                      : "Using the currently active profile (must be OpenAI-compatible)"}
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* OpenAI API Key for Voice Input */}
      <div className="space-y-2">
        <div className="pb-2">
          <h4 className="text-sm font-medium text-foreground">Voice Input</h4>
        </div>

        <div className="bg-background rounded-lg border border-border overflow-hidden">
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between gap-6">
              <div className="flex-1">
                <Label className="text-sm font-medium">OpenAI API Key</Label>
                <p className="text-xs text-muted-foreground">
                  Required for voice transcription (Whisper API). Free users need their own key.
                </p>
              </div>
              <div className="flex-shrink-0 w-80">
                <Input
                  type="password"
                  value={openaiKey}
                  onChange={(e) => setOpenaiKey(e.target.value)}
                  className="w-full"
                  placeholder="sk-..."
                />
              </div>
            </div>
          </div>

          <div className="bg-muted p-3 rounded-b-lg flex justify-end gap-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetOpenAI}
              disabled={!canResetOpenAI || setOpenAIKeyMutation.isPending}
              className="hover:bg-red-500/10 hover:text-red-600"
            >
              Remove
            </Button>
            <Button
              size="sm"
              onClick={handleSaveOpenAI}
              disabled={!canSaveOpenAI || setOpenAIKeyMutation.isPending}
            >
              Save
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
