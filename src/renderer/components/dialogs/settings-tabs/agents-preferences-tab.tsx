import { useAtom } from "jotai"
import { useEffect, useState } from "react"
import {
  analyticsOptOutAtom,
  autoAdvanceTargetAtom,
  autoUpdateCheckEnabledAtom,
  ctrlTabTargetAtom,
  defaultAgentModeAtom,
  defaultWorktreeBaseLocationAtom,
  desktopNotificationsEnabledAtom,
  extendedThinkingEnabledAtom,
  soundNotificationsEnabledAtom,
  type AgentMode,
  type AutoAdvanceTarget,
  type CtrlTabTarget,
} from "../../../lib/atoms"
import { Button } from "../../ui/button"
import { Kbd } from "../../ui/kbd"
import { Input } from "../../ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "../../ui/select"
import { Switch } from "../../ui/switch"
import { FolderOpen } from "lucide-react"
import { trpc } from "../../../lib/trpc"

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

export function AgentsPreferencesTab() {
  const [thinkingEnabled, setThinkingEnabled] = useAtom(
    extendedThinkingEnabledAtom,
  )
  const [soundEnabled, setSoundEnabled] = useAtom(soundNotificationsEnabledAtom)
  const [desktopNotificationsEnabled, setDesktopNotificationsEnabled] = useAtom(desktopNotificationsEnabledAtom)
  const [autoUpdateCheckEnabled, setAutoUpdateCheckEnabled] = useAtom(autoUpdateCheckEnabledAtom)
  const [analyticsOptOut, setAnalyticsOptOut] = useAtom(analyticsOptOutAtom)
  const [ctrlTabTarget, setCtrlTabTarget] = useAtom(ctrlTabTargetAtom)
  const [autoAdvanceTarget, setAutoAdvanceTarget] = useAtom(autoAdvanceTargetAtom)
  const [defaultAgentMode, setDefaultAgentMode] = useAtom(defaultAgentModeAtom)
  const [defaultWorktreeBaseLocation, setDefaultWorktreeBaseLocation] = useAtom(defaultWorktreeBaseLocationAtom)
  const isNarrowScreen = useIsNarrowScreen()

  // Co-authored-by setting from Claude settings.json
  const { data: includeCoAuthoredBy, refetch: refetchCoAuthoredBy } =
    trpc.claudeSettings.getIncludeCoAuthoredBy.useQuery()
  const setCoAuthoredByMutation =
    trpc.claudeSettings.setIncludeCoAuthoredBy.useMutation({
      onSuccess: () => {
        refetchCoAuthoredBy()
      },
    })

  const handleCoAuthoredByToggle = (enabled: boolean) => {
    setCoAuthoredByMutation.mutate({ enabled })
  }

  // Sync opt-out status to main process
  const handleAnalyticsToggle = async (optedOut: boolean) => {
    setAnalyticsOptOut(optedOut)
    // Notify main process
    try {
      await window.desktopApi?.setAnalyticsOptOut(optedOut)
    } catch (error) {
      console.error("Failed to sync analytics opt-out to main process:", error)
    }
  }

  // Folder picker mutation
  const selectFolderMutation = trpc.settings.selectFolder.useMutation()
  const setSettingMutation = trpc.settings.set.useMutation()

  const handleBrowseFolder = async () => {
    const selectedPath = await selectFolderMutation.mutateAsync()
    if (selectedPath) {
      setDefaultWorktreeBaseLocation(selectedPath)
    }
  }

  // Sync default worktree location to main process whenever it changes
  useEffect(() => {
    const syncToMainProcess = async () => {
      if (defaultWorktreeBaseLocation) {
        try {
          await setSettingMutation.mutateAsync({
            key: "defaultWorktreeBaseLocation",
            value: defaultWorktreeBaseLocation,
          })
          console.log("[Preferences] Synced default worktree location to main process:", defaultWorktreeBaseLocation)
        } catch (error) {
          console.error("[Preferences] Failed to sync default worktree location:", error)
        }
      }
    }
    syncToMainProcess()
  }, [defaultWorktreeBaseLocation])

  return (
    <div className="p-6 space-y-6">
      {/* Header - hidden on narrow screens since it's in the navigation bar */}
      {!isNarrowScreen && (
        <div className="flex flex-col space-y-1.5 text-center sm:text-left">
          <h3 className="text-sm font-semibold text-foreground">Preferences</h3>
          <p className="text-xs text-muted-foreground">
            Configure Claude's behavior and features
          </p>
        </div>
      )}

      {/* Features Section */}
      <div className="bg-background rounded-lg border border-border overflow-hidden">
        <div className="p-4 space-y-6">
          {/* Extended Thinking Toggle */}
          <div className="flex items-start justify-between">
            <div className="flex flex-col space-y-1">
              <span className="text-sm font-medium text-foreground">
                Extended Thinking
              </span>
              <span className="text-xs text-muted-foreground">
                Enable deeper reasoning with more thinking tokens (uses more
                credits).{" "}
                <span className="text-foreground/70">Disables response streaming.</span>
              </span>
            </div>
            <Switch
              checked={thinkingEnabled}
              onCheckedChange={setThinkingEnabled}
            />
          </div>

          {/* Desktop Notifications Toggle */}
          <div className="flex items-start justify-between">
            <div className="flex flex-col space-y-1">
              <span className="text-sm font-medium text-foreground">
                Desktop Notifications
              </span>
              <span className="text-xs text-muted-foreground">
                Show system notifications when agent needs input or completes work
              </span>
            </div>
            <Switch checked={desktopNotificationsEnabled} onCheckedChange={setDesktopNotificationsEnabled} />
          </div>

          {/* Sound Notifications Toggle */}
          <div className="flex items-start justify-between">
            <div className="flex flex-col space-y-1">
              <span className="text-sm font-medium text-foreground">
                Sound Notifications
              </span>
              <span className="text-xs text-muted-foreground">
                Play a sound when agent completes work while you're away
              </span>
            </div>
            <Switch checked={soundEnabled} onCheckedChange={setSoundEnabled} />
          </div>

          {/* Auto-Update Check Toggle */}
          <div className="flex items-start justify-between">
            <div className="flex flex-col space-y-1">
              <span className="text-sm font-medium text-foreground">
                Auto-Update Check
              </span>
              <span className="text-xs text-muted-foreground">
                Automatically check for updates on startup and window focus
              </span>
            </div>
            <Switch checked={autoUpdateCheckEnabled} onCheckedChange={setAutoUpdateCheckEnabled} />
          </div>

          {/* Co-Authored-By Toggle */}
          <div className="flex items-start justify-between">
            <div className="flex flex-col space-y-1">
              <span className="text-sm font-medium text-foreground">
                Include Co-Authored-By
              </span>
              <span className="text-xs text-muted-foreground">
                Add "Co-authored-by: Claude" to git commits made by Claude
              </span>
            </div>
            <Switch
              checked={includeCoAuthoredBy ?? true}
              onCheckedChange={handleCoAuthoredByToggle}
              disabled={setCoAuthoredByMutation.isPending}
            />
          </div>

          {/* Quick Switch */}
          <div className="flex items-start justify-between">
            <div className="flex flex-col space-y-1">
              <span className="text-sm font-medium text-foreground">
                Quick Switch
              </span>
              <span className="text-xs text-muted-foreground">
                What <Kbd>⌃Tab</Kbd> switches between
              </span>
            </div>
            <Select
              value={ctrlTabTarget}
              onValueChange={(value: CtrlTabTarget) => setCtrlTabTarget(value)}
            >
              <SelectTrigger className="w-auto px-2">
                <span className="text-xs">
                  {ctrlTabTarget === "workspaces" ? "Workspaces" : "Agents"}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="workspaces">Workspaces</SelectItem>
                <SelectItem value="agents">Agents</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Auto-advance */}
          <div className="flex items-start justify-between">
            <div className="flex flex-col space-y-1">
              <span className="text-sm font-medium text-foreground">
                Auto-advance
              </span>
              <span className="text-xs text-muted-foreground">
                Where to go after archiving a workspace
              </span>
            </div>
            <Select
              value={autoAdvanceTarget}
              onValueChange={(value: AutoAdvanceTarget) => setAutoAdvanceTarget(value)}
            >
              <SelectTrigger className="w-auto px-2">
                <span className="text-xs">
                  {autoAdvanceTarget === "next"
                    ? "Go to next workspace"
                    : autoAdvanceTarget === "previous"
                      ? "Go to previous workspace"
                      : "Close workspace"}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="next">Go to next workspace</SelectItem>
                <SelectItem value="previous">Go to previous workspace</SelectItem>
                <SelectItem value="close">Close workspace</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Default Mode */}
          <div className="flex items-start justify-between">
            <div className="flex flex-col space-y-1">
              <span className="text-sm font-medium text-foreground">
                Default Mode
              </span>
              <span className="text-xs text-muted-foreground">
                Mode for new agents (Plan = read-only, Agent = can edit)
              </span>
            </div>
            <Select
              value={defaultAgentMode}
              onValueChange={(value: AgentMode) => setDefaultAgentMode(value)}
            >
              <SelectTrigger className="w-auto px-2">
                <span className="text-xs">
                  {defaultAgentMode === "agent" ? "Agent" : "Plan"}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="agent">Agent</SelectItem>
                <SelectItem value="plan">Plan</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Privacy Section */}
      <div className="space-y-2">
        <div className="pb-2">
          <h4 className="text-sm font-medium text-foreground">Privacy</h4>
          <p className="text-xs text-muted-foreground mt-1">
            Control what data you share with us
          </p>
        </div>

        <div className="bg-background rounded-lg border border-border overflow-hidden">
          <div className="p-4">
            {/* Share Usage Analytics */}
            <div className="flex items-start justify-between">
              <div className="flex flex-col space-y-1">
                <span className="text-sm font-medium text-foreground">
                  Share Usage Analytics
                </span>
                <span className="text-xs text-muted-foreground">
                  Help us improve Agents by sharing anonymous usage data. We only track feature usage and app performance–never your code, prompts, or messages. No AI training on your data.
                </span>
              </div>
              <Switch
                checked={!analyticsOptOut}
                onCheckedChange={(enabled) => handleAnalyticsToggle(!enabled)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Worktree Settings Section */}
      <div className="space-y-2">
        <div className="pb-2">
          <h4 className="text-sm font-medium text-foreground">Worktree Settings</h4>
          <p className="text-xs text-muted-foreground mt-1">
            Configure default location for Git worktrees
          </p>
        </div>
        <div className="bg-background rounded-lg border border-border overflow-hidden">
          <div className="p-4 space-y-4">
            {/* Global Default Worktree Location */}
            <div className="space-y-2">
              <div>
                <span className="text-sm font-medium text-foreground">
                  Default Worktree Location
                </span>
                <p className="text-xs text-muted-foreground mt-1">
                  Global default for all projects. Can be overridden per project.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  value={defaultWorktreeBaseLocation}
                  onChange={(e) => setDefaultWorktreeBaseLocation(e.target.value)}
                  placeholder="Default: ~/.21st/worktrees"
                  className="flex-1 font-mono text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleBrowseFolder}
                  disabled={selectFolderMutation.isPending}
                  className="shrink-0"
                >
                  <FolderOpen className="h-4 w-4" />
                  Browse
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Worktrees will be created at:{" "}
                <code className="bg-muted px-1 py-0.5 rounded">
                  {defaultWorktreeBaseLocation || "~/.21st/worktrees"}/&lt;project-name&gt;/&lt;worktree-name&gt;
                </code>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
