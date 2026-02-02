import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { useSetAtom } from "jotai"
import { trpc } from "../../../lib/trpc"
import { Button, buttonVariants } from "../../ui/button"
import { Input } from "../../ui/input"
import { Label } from "../../ui/label"
import { Textarea } from "../../ui/textarea"
import { AIPenIcon } from "../../ui/icons"
import { Plus, Trash2, FolderOpen } from "lucide-react"
import { invalidateProjectIcon, useProjectIcon } from "../../../lib/hooks/use-project-icon"
import { ProjectIcon } from "../../ui/project-icon"
import finderIcon from "../../../assets/app-icons/finder.png"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "../../ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../../ui/alert-dialog"
import { toast } from "sonner"
import { COMMAND_PROMPTS } from "../../../features/agents/commands"
import {
  agentsSettingsDialogOpenAtom,
  selectedAgentChatIdAtom,
  selectedProjectAtom,
} from "../../../lib/atoms"
import { cn } from "../../../lib/utils"
import { ResizableSidebar } from "../../ui/resizable-sidebar"
import { settingsProjectsSidebarWidthAtom } from "../../../features/agents/atoms"

// --- Detail Panel ---
function ProjectDetail({ projectId }: { projectId: string }) {
  // Get config for selected project
  const { data: configData, refetch: refetchConfig } =
    trpc.worktreeConfig.get.useQuery(
      { projectId },
      { enabled: !!projectId },
    )

  // Save mutation (auto-save, no toast on success — only on error)
  const saveMutation = trpc.worktreeConfig.save.useMutation({
    onSuccess: (data) => {
      toast.success(`Saved to ${data.path}`)
      refetchConfig()
    },
    onError: (err) => {
      toast.error(`Failed to save: ${err.message}`)
    },
  })

  // For "Fill with AI" - create chat and close settings
  const setSettingsDialogOpen = useSetAtom(agentsSettingsDialogOpenAtom)
  const setSelectedChatId = useSetAtom(selectedAgentChatIdAtom)
  const setSelectedProject = useSetAtom(selectedProjectAtom)
  const createChatMutation = trpc.chats.create.useMutation({
    onSuccess: (data) => {
      setSettingsDialogOpen(false)
      setSelectedChatId(data.id)
    },
  })

  // Get project info
  const { data: project, refetch: refetchProject } = trpc.projects.get.useQuery(
    { id: projectId },
    { enabled: !!projectId },
  )

  // Update worktree location mutation
  const updateWorktreeLocationMutation = trpc.projects.updateWorktreeLocation.useMutation({
    onSuccess: () => {
      refetchConfig()
      refetchProject()
    },
  })

  // Folder picker mutation
  const selectFolderMutation = trpc.settings.selectFolder.useMutation()

  const handleBrowseFolder = async () => {
    const selectedPath = await selectFolderMutation.mutateAsync()
    if (selectedPath && projectId) {
      updateWorktreeLocationMutation.mutate({
        projectId,
        worktreeBaseLocation: selectedPath,
      })
    }
  }

  // Update sparse checkout exclusions mutation
  const updateExclusionsMutation = trpc.projects.updateSparseCheckoutExclusions.useMutation({
    onSuccess: () => {
      refetchProject()
      toast.success("Sparse checkout exclusions updated")
    },
  })

  // Update agent permission mode mutations
  const updateAgentPermissionLocalMutation = trpc.projects.updateAgentPermissionLocalMode.useMutation({
    onSuccess: () => {
      refetchProject()
      toast.success("Local mode permissions updated")
    },
  })

  const updateAgentPermissionWorktreeMutation = trpc.projects.updateAgentPermissionWorktreeMode.useMutation({
    onSuccess: () => {
      refetchProject()
      toast.success("Worktree mode permissions updated")
    },
  })

  // Cached project icon
  const { src: iconSrc } = useProjectIcon(project)

  // Rename mutation
  const renameMutation = trpc.projects.rename.useMutation({
    onSuccess: () => {
      refetchProject()
      toast.success("Project renamed")
    },
    onError: (err) => {
      toast.error(`Failed to rename: ${err.message}`)
    },
  })

  // Delete project mutation
  const deleteMutation = trpc.projects.delete.useMutation({
    onSuccess: () => {
      toast.success("Project removed from list")
      setSelectedProject((current) => {
        if (current?.id === projectId) {
          return null
        }
        return current
      })
    },
    onError: (err) => {
      toast.error(`Failed to delete project: ${err.message}`)
    },
  })

  // Icon mutations
  const uploadIconMutation = trpc.projects.uploadIcon.useMutation({
    onSuccess: (data) => {
      if (!data) return // User cancelled file picker
      invalidateProjectIcon(projectId)
      refetchProject()
      toast.success("Icon updated")
    },
    onError: (err) => {
      toast.error(`Failed to upload icon: ${err.message}`)
    },
  })

  const removeIconMutation = trpc.projects.removeIcon.useMutation({
    onSuccess: () => {
      invalidateProjectIcon(projectId)
      refetchProject()
      toast.success("Icon removed")
    },
  })

  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  // Project name editing
  const [projectName, setProjectName] = useState("")
  const savedNameRef = useRef("")

  useEffect(() => {
    if (project?.name) {
      setProjectName(project.name)
      savedNameRef.current = project.name
    }
  }, [project?.name])

  const handleNameBlur = useCallback(async () => {
    const trimmed = projectName.trim()
    if (!trimmed || trimmed === savedNameRef.current) {
      setProjectName(savedNameRef.current)
      return
    }
    renameMutation.mutate({ id: projectId, name: trimmed })
    savedNameRef.current = trimmed
  }, [projectName, projectId, renameMutation])

  // Local state
  const [saveTarget, setSaveTarget] = useState<"cursor" | "1code">("1code")
  const [commands, setCommands] = useState<string[]>([""])
  const [unixCommands, setUnixCommands] = useState<string[]>([])
  const [windowsCommands, setWindowsCommands] = useState<string[]>([])
  const [showPlatformSpecific, setShowPlatformSpecific] = useState(false)
  const [sparseExclusions, setSparseExclusions] = useState("") // Textarea content (one pattern per line)

  // Sync sparse checkout exclusions from project data
  useEffect(() => {
    if (project?.sparseCheckoutExclusions) {
      try {
        const exclusions = JSON.parse(project.sparseCheckoutExclusions)
        setSparseExclusions(exclusions.join("\n"))
      } catch {
        setSparseExclusions("")
      }
    } else {
      setSparseExclusions("")
    }
  }, [project?.sparseCheckoutExclusions])

  // Ref to track last saved state for dirty checking
  const savedConfigRef = useRef<string>("")
  const configReadyRef = useRef(false)

  // Sync from server data
  useEffect(() => {
    if (configData) {
      const newSaveTarget = configData.source === "cursor" ? "cursor" : "1code"
      setSaveTarget(newSaveTarget)

      let newCommands: string[] = [""]
      let newUnix: string[] = []
      let newWin: string[] = []

      if (configData.config) {
        const isComment = (s: string) => s.trimStart().startsWith("#")
        const filterComments = (arr: string[]) => arr.filter((s) => !isComment(s))

        const generic = configData.config["setup-worktree"]
        const genericArr = Array.isArray(generic)
          ? filterComments(generic)
          : generic && !isComment(generic)
            ? [generic]
            : []
        newCommands = genericArr.length > 0 ? [...genericArr, ""] : [""]

        const unix = configData.config["setup-worktree-unix"]
        const win = configData.config["setup-worktree-windows"]

        newUnix = Array.isArray(unix) ? filterComments(unix) : unix && !isComment(unix) ? [unix] : []
        newWin = Array.isArray(win) ? filterComments(win) : win && !isComment(win) ? [win] : []

        if (unix || win) {
          setShowPlatformSpecific(true)
        }
      }

      setCommands(newCommands)
      setUnixCommands(newUnix)
      setWindowsCommands(newWin)

      // Snapshot the initial state so doSave won't fire on first render
      savedConfigRef.current = JSON.stringify({
        commands: newCommands,
        unixCommands: newUnix,
        windowsCommands: newWin,
        saveTarget: newSaveTarget,
      })
      configReadyRef.current = true
    }
  }, [configData])

  const doSave = useCallback(() => {
    if (!projectId || !configReadyRef.current) return

    const currentState = JSON.stringify({ commands, unixCommands, windowsCommands, saveTarget })
    if (currentState === savedConfigRef.current) return

    const config: Record<string, string[]> = {}
    const filteredCommands = commands.filter((c) => c.trim())
    const filteredUnix = unixCommands.filter((c) => c.trim())
    const filteredWin = windowsCommands.filter((c) => c.trim())

    if (filteredCommands.length > 0) config["setup-worktree"] = filteredCommands
    if (filteredUnix.length > 0) config["setup-worktree-unix"] = filteredUnix
    if (filteredWin.length > 0) config["setup-worktree-windows"] = filteredWin

    saveMutation.mutate({ projectId, config, target: saveTarget })
    savedConfigRef.current = currentState
  }, [projectId, commands, unixCommands, windowsCommands, saveTarget, saveMutation])

  const updateCommand = (index: number, value: string, list: string[], setter: (v: string[]) => void) => {
    const newList = [...list]
    newList[index] = value
    setter(newList)
  }

  const pendingSaveRef = useRef(false)

  const removeCommand = (index: number, list: string[], setter: (v: string[]) => void, allowEmpty = false) => {
    if (!allowEmpty && list.length <= 1) return
    setter(list.filter((_, i) => i !== index))
    pendingSaveRef.current = true
  }

  // Save after state updates from remove or saveTarget change
  useEffect(() => {
    if (pendingSaveRef.current) {
      pendingSaveRef.current = false
      doSave()
    }
  }, [commands, unixCommands, windowsCommands, saveTarget, doSave])

  const addCommand = (list: string[], setter: (v: string[]) => void) => {
    setter([...list, ""])
  }


  const cursorExists = configData?.available?.cursor?.exists ?? false

  const openInFinderMutation = trpc.external.openInFinder.useMutation()

  const handleOpenInFinder = () => {
    if (project?.path) {
      openInFinderMutation.mutate(project.path)
    }
  }

  // Helper to render a command list with add/remove
  const renderCommandList = (
    list: string[],
    setter: (v: string[]) => void,
    placeholder: string,
    allowEmpty = false,
  ) => (
    <div className="space-y-2">
      {list.map((cmd, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            value={cmd}
            onChange={(e) => updateCommand(i, e.target.value, list, setter)}
            onBlur={doSave}
            placeholder={placeholder}
            className="flex-1 font-mono text-sm"
          />
          {(allowEmpty || list.length > 1) && (
            <button
              type="button"
              className="h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive transition-colors"
              onClick={() => removeCommand(i, list, setter, allowEmpty)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => addCommand(list, setter)}
      >
        <Plus className="h-3.5 w-3.5" />
        Add command
      </button>
    </div>
  )

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      {!isNarrowScreen && (
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col space-y-1.5 text-center sm:text-left">
            <h3 className="text-sm font-semibold text-foreground">Worktree Setup</h3>
            <p className="text-xs text-muted-foreground">
              Configure setup commands that run when a new worktree is created
            </p>
          </div>
          <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove Project
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove Project?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will remove "{project?.name}" from your project list. Your files will not be deleted.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteMutation.mutate({ id: projectId })}
                  disabled={deleteMutation.isPending}
                  className={buttonVariants({ variant: "destructive" })}
                >
                  {deleteMutation.isPending ? "Removing..." : "Remove"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      {/* Worktree Base Location (Per-Project Override) */}
      <div className="space-y-2">
        <div className="pb-2">
          <h4 className="text-sm font-medium text-foreground">
            Worktree Base Location
          </h4>
          <p className="text-xs text-muted-foreground mt-1">
            Custom base path for this project's worktrees. Leave empty to use global default.
          </p>
        </div>
        <div className="bg-background rounded-lg border border-border overflow-hidden">
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Input
                value={project?.worktreeBaseLocation || ""}
                onChange={(e) => {
                  const location = e.target.value || null
                  updateWorktreeLocationMutation.mutate({
                    projectId,
                    worktreeBaseLocation: location,
                  })
                }}
                placeholder="Use global default (~/.21st/worktrees)"
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
                {project?.worktreeBaseLocation || "~/.21st/worktrees"}/{project?.name || "project"}/
              </code>
            </p>
          </div>
        </div>
      </div>

      {/* Sparse Checkout Exclusions */}
      <div className="space-y-2">
        <div className="pb-2">
          <h4 className="text-sm font-medium text-foreground">
            Sparse Checkout Exclusions
          </h4>
          <p className="text-xs text-muted-foreground mt-1">
            Exclude large folders (assets, images, etc.) from worktrees to save space and improve performance.
          </p>
        </div>
        <div className="bg-background rounded-lg border border-border overflow-hidden">
          <div className="p-4 space-y-3">
            <div>
              <Label className="text-sm font-medium">Excluded Folders & Patterns</Label>
              <p className="text-xs text-muted-foreground mt-1">
                Enter one pattern per line. Examples: <code className="bg-muted px-1 py-0.5 rounded">assets/</code>, <code className="bg-muted px-1 py-0.5 rounded">*.png</code>, <code className="bg-muted px-1 py-0.5 rounded">node_modules/</code>
              </p>
            </div>
            <Textarea
              value={sparseExclusions}
              onChange={(e) => setSparseExclusions(e.target.value)}
              placeholder="assets/\nContent/\n*.png\n*.jpg\n*.mp4\nnode_modules/"
              className="font-mono text-sm min-h-[100px] resize-y"
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {sparseExclusions
                  ? `${sparseExclusions.split("\n").filter(Boolean).length} pattern(s) configured`
                  : "No exclusions - full checkout"}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const exclusions = sparseExclusions
                    .split("\n")
                    .map((s) => s.trim())
                    .filter(Boolean)

                  updateExclusionsMutation.mutate({
                    projectId,
                    exclusions: exclusions.length > 0 ? exclusions : undefined,
                  })
                }}
                disabled={updateExclusionsMutation.isPending}
              >
                {updateExclusionsMutation.isPending ? "Saving..." : "Save Exclusions"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Agent Permissions (Per-Project Override) */}
      <div className="space-y-2">
        <div className="pb-2">
          <h4 className="text-sm font-medium text-foreground">
            Agent Permissions
          </h4>
          <p className="text-xs text-muted-foreground mt-1">
            Override global permission defaults for this project. Leave empty to use global defaults.
          </p>
        </div>
        <div className="bg-background rounded-lg border border-border overflow-hidden">
          <div className="p-4 space-y-4">
            {/* Local Mode Permission */}
            <div className="flex items-start justify-between">
              <div className="flex flex-col space-y-1">
                <span className="text-sm font-medium text-foreground">
                  Local Mode Permissions
                </span>
                <span className="text-xs text-muted-foreground">
                  When working directly in your project folder
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={project?.agentPermissionLocalMode ?? "global"}
                  onValueChange={(value: "auto" | "prompt" | "restrict" | "global") => {
                    if (value === "global") {
                      updateAgentPermissionLocalMutation.mutate({
                        projectId,
                        mode: null,
                      })
                    } else {
                      updateAgentPermissionLocalMutation.mutate({
                        projectId,
                        mode: value,
                      })
                    }
                  }}
                >
                  <SelectTrigger className="w-40">
                    <span className="text-xs">
                      {project?.agentPermissionLocalMode === "prompt" ? "Prompt for approval"
                        : project?.agentPermissionLocalMode === "auto" ? "Auto-approve"
                        : project?.agentPermissionLocalMode === "restrict" ? "Restricted"
                        : "Use global default"}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">Use global default</SelectItem>
                    <SelectItem value="prompt">Prompt for approval</SelectItem>
                    <SelectItem value="auto">Auto-approve</SelectItem>
                    <SelectItem value="restrict">Restricted</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Worktree Mode Permission */}
            <div className="flex items-start justify-between">
              <div className="flex flex-col space-y-1">
                <span className="text-sm font-medium text-foreground">
                  Worktree Mode Permissions
                </span>
                <span className="text-xs text-muted-foreground">
                  When working in an isolated worktree
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={project?.agentPermissionWorktreeMode ?? "global"}
                  onValueChange={(value: "auto" | "prompt" | "restrict" | "global") => {
                    if (value === "global") {
                      updateAgentPermissionWorktreeMutation.mutate({
                        projectId,
                        mode: null,
                      })
                    } else {
                      updateAgentPermissionWorktreeMutation.mutate({
                        projectId,
                        mode: value,
                      })
                    }
                  }}
                >
                  <SelectTrigger className="w-40">
                    <span className="text-xs">
                      {project?.agentPermissionWorktreeMode === "auto" ? "Auto-approve"
                        : project?.agentPermissionWorktreeMode === "prompt" ? "Prompt for approval"
                        : project?.agentPermissionWorktreeMode === "restrict" ? "Restricted"
                        : "Use global default"}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">Use global default</SelectItem>
                    <SelectItem value="auto">Auto-approve</SelectItem>
                    <SelectItem value="prompt">Prompt for approval</SelectItem>
                    <SelectItem value="restrict">Restricted</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      </div>
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto p-6 space-y-6">

        {/* ── General ── */}
        <div>
          <h4 className="text-sm font-medium text-foreground mb-2">General</h4>
          <div className="bg-background rounded-lg border border-border overflow-hidden">
            {/* Name */}
            <div className="flex items-center justify-between p-4">
              <div className="flex-1">
                <span className="text-sm font-medium text-foreground">Name</span>
                <p className="text-sm text-muted-foreground">Display name for this project</p>
              </div>
              <div className="flex-shrink-0 w-80">
                <Input
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  onBlur={handleNameBlur}
                  className="w-full"
                  placeholder="Project name"
                />
              </div>
            </div>

            {/* Icon */}
            <div className="flex items-center justify-between p-4 border-t border-border">
              <div className="flex-1">
                <span className="text-sm font-medium text-foreground">Icon</span>
                <p className="text-sm text-muted-foreground">Project avatar in sidebar</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  className="relative h-10 w-10 rounded-lg border border-border overflow-hidden flex items-center justify-center cursor-pointer bg-muted group/icon"
                  onClick={() => uploadIconMutation.mutate({ id: projectId })}
                  title="Click to change icon"
                >
                  {iconSrc ? (
                    <img
                      src={iconSrc}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <FolderOpen className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover/icon:opacity-100 transition-opacity duration-150">
                    <ImageIcon className="h-4 w-4 text-white" />
                  </div>
                </button>
                {project?.iconPath && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => removeIconMutation.mutate({ id: projectId })}
                  >
                    Reset
                  </Button>
                )}
              </div>
            </div>

            {/* Path */}
            <div className="flex items-center justify-between p-4 border-t border-border">
              <div className="flex-1 min-w-0 mr-4">
                <span className="text-sm font-medium text-foreground">Path</span>
                <p className="text-sm text-muted-foreground truncate">{project?.path || "—"}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 flex-shrink-0 pl-2"
                onClick={handleOpenInFinder}
                disabled={!project?.path}
              >
                <img src={finderIcon} alt="" className="h-3.5 w-3.5" />
                Finder
              </Button>
            </div>

            {/* Repository */}
            {project?.gitOwner && project?.gitRepo && (
              <div className="flex items-center justify-between p-4 border-t border-border">
                <div className="flex-1">
                  <span className="text-sm font-medium text-foreground">Repository</span>
                  <p className="text-sm text-muted-foreground">
                    {project.gitOwner}/{project.gitRepo}
                  </p>
                </div>
                {project.gitProvider === "github" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 flex-shrink-0 pl-2"
                    onClick={() => {
                      window.open(
                        `https://github.com/${project.gitOwner}/${project.gitRepo}`,
                        "_blank",
                      )
                    }}
                  >
                    <ExternalLinkIcon className="h-3.5 w-3.5" />
                    GitHub
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Config ── */}
        <div>
          <h4 className="text-sm font-medium text-foreground mb-2">Config</h4>
          <div className="bg-background rounded-lg border border-border overflow-hidden">
            <div className="flex items-center justify-between p-4">
              <div className="flex-1">
                <span className="text-sm font-medium text-foreground">Config file</span>
                <p className="text-sm text-muted-foreground">Where worktree setup is stored</p>
              </div>
              <Select
                value={saveTarget}
                onValueChange={(v) => {
                  setSaveTarget(v as "cursor" | "1code")
                  pendingSaveRef.current = true
                }}
              >
                <SelectTrigger className="w-auto px-3">
                  <span className="text-sm font-mono">
                    {saveTarget === "cursor" ? ".cursor/worktrees.json" : ".1code/worktree.json"}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1code">.1code/worktree.json</SelectItem>
                  {cursorExists && (
                    <SelectItem value="cursor">.cursor/worktrees.json</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* ── Worktree ── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-foreground">Worktree</h4>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 shrink-0"
              onClick={() => {
                const prompt = COMMAND_PROMPTS["worktree-setup"]
                if (prompt && projectId) {
                  createChatMutation.mutate({
                    projectId,
                    name: "Worktree Setup",
                    initialMessageParts: [{ type: "text", text: prompt }],
                    useWorktree: false,
                    mode: "agent",
                  })
                }
              }}
              disabled={!projectId || createChatMutation.isPending}
            >
              <AIPenIcon className="h-3.5 w-3.5" />
              Fill with AI
            </Button>
          </div>
          <div className="bg-background rounded-lg border border-border overflow-hidden">
            {/* Setup commands */}
            <div className="p-4 space-y-3">
              <div>
                <span className="text-sm font-medium text-foreground">Setup Commands</span>
                <p className="text-sm text-muted-foreground">
                  Run after worktree creation.{" "}
                  <button
                    type="button"
                    className="font-mono text-xs bg-muted px-1 py-0.5 rounded hover:text-foreground transition-colors cursor-pointer"
                    onClick={() => {
                      navigator.clipboard.writeText("$ROOT_WORKTREE_PATH")
                      toast.success("Copied to clipboard")
                    }}
                    title="Click to copy"
                  >
                    $ROOT_WORKTREE_PATH
                  </button>
                  {" "}for main repo.
                </p>
              </div>
              {renderCommandList(commands, setCommands, "bun install && cp $ROOT_WORKTREE_PATH/.env .env")}
            </div>

            {/* Platform overrides — macOS/Linux */}
            {(unixCommands.length > 0 || showPlatformSpecific) && (
              <div className="p-4 border-t border-border space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">macOS / Linux</span>
                  {unixCommands.length === 0 && (
                    <span className="text-sm text-muted-foreground">Falls back to commands above</span>
                  )}
                </div>
                {renderCommandList(unixCommands, setUnixCommands, "brew install deps", true)}
              </div>
            )}

            {/* Platform overrides — Windows */}
            {(windowsCommands.length > 0 || showPlatformSpecific) && (
              <div className="p-4 border-t border-border space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">Windows</span>
                  {windowsCommands.length === 0 && (
                    <span className="text-sm text-muted-foreground">Falls back to commands above</span>
                  )}
                </div>
                {renderCommandList(windowsCommands, setWindowsCommands, "npm ci", true)}
              </div>
            )}

            {/* Add platform overrides link */}
            {!showPlatformSpecific && unixCommands.length === 0 && windowsCommands.length === 0 && (
              <div className="p-4 border-t border-border">
                <button
                  type="button"
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowPlatformSpecific(true)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add platform-specific overrides
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Danger Zone ── */}
        <div>
          <h4 className="text-sm font-medium text-foreground mb-2">Danger Zone</h4>
          <div className="bg-background rounded-lg border border-border overflow-hidden">
          <div className="flex items-center justify-between p-4">
            <div className="flex-1">
              <span className="text-sm font-medium text-foreground">Remove Project</span>
              <p className="text-sm text-muted-foreground">
                Remove from your list. Files on disk will not be deleted.
              </p>
            </div>
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 hover:text-destructive hover:border-destructive/30 hover:bg-destructive/10"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove Project?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will remove &quot;{project?.name}&quot; from your project list. Your files will not be deleted.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteMutation.mutate({ id: projectId })}
                    disabled={deleteMutation.isPending}
                    className={buttonVariants({ variant: "destructive" })}
                  >
                    {deleteMutation.isPending ? "Removing..." : "Remove"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// --- Main Two-Panel Component ---
export function AgentsProjectsTab() {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Focus search on "/" hotkey
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const tag = (e.target as HTMLElement)?.tagName
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [])

  const { data: projects, isLoading } = trpc.projects.list.useQuery()

  const openFolderMutation = trpc.projects.openFolder.useMutation({
    onSuccess: (project) => {
      if (project) {
        setSelectedProjectId(project.id)
      }
    },
  })

  // Filter projects by search
  const filteredProjects = useMemo(() => {
    if (!projects) return []
    if (!searchQuery.trim()) return projects
    const q = searchQuery.toLowerCase()
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.path?.toLowerCase().includes(q) ||
        p.gitRepo?.toLowerCase().includes(q),
    )
  }, [projects, searchQuery])

  // Auto-select first project
  useEffect(() => {
    if (selectedProjectId || isLoading) return
    if (projects && projects.length > 0) {
      setSelectedProjectId(projects[0]!.id)
    }
  }, [projects, selectedProjectId, isLoading])

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left sidebar - project list */}
      <ResizableSidebar
        isOpen={true}
        onClose={() => {}}
        widthAtom={settingsProjectsSidebarWidthAtom}
        minWidth={200}
        maxWidth={400}
        side="left"
        animationDuration={0}
        initialWidth={240}
        exitWidth={240}
        disableClickToClose={true}
      >
        <div className="flex flex-col h-full bg-background border-r overflow-hidden" style={{ borderRightWidth: "0.5px" }}>
          {/* Search + Add */}
          <div className="px-2 pt-2 flex-shrink-0 flex items-center gap-1.5">
            <input
              ref={searchInputRef}
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-7 w-full rounded-lg text-sm bg-muted border border-input px-3 placeholder:text-muted-foreground/40 outline-none"
            />
            <button
              onClick={() => openFolderMutation.mutate()}
              className="h-7 w-7 shrink-0 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors cursor-pointer"
              title="Add project folder"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {/* Project list */}
          <div className="flex-1 overflow-y-auto px-2 pt-2 pb-2">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <FolderFilledIcon className="h-5 w-5 text-muted-foreground animate-pulse" />
              </div>
            ) : !projects || projects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                <FolderFilledIcon className="h-8 w-8 text-border mb-3" />
                <p className="text-sm text-muted-foreground mb-1">No projects</p>
                <button
                  onClick={() => openFolderMutation.mutate()}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  Add your first project
                </button>
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-xs text-muted-foreground">No results found</p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {filteredProjects.map((project) => {
                  const isSelected = selectedProjectId === project.id
                  return (
                    <button
                      key={project.id}
                      onClick={() => setSelectedProjectId(project.id)}
                      className={cn(
                        "w-full text-left py-1.5 px-2 rounded-md transition-colors duration-150 cursor-pointer",
                        isSelected
                          ? "bg-foreground/5 text-foreground"
                          : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <ProjectIcon project={project} className="h-4 w-4" />
                        <span className={cn("text-sm truncate flex-1", isSelected && "font-medium")}>
                          {project.name}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </ResizableSidebar>

      {/* Right content - detail panel */}
      <div className="flex-1 min-w-0 h-full overflow-hidden">
        {selectedProjectId ? (
          <ProjectDetail projectId={selectedProjectId} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <FolderFilledIcon className="h-12 w-12 text-border mb-4" />
            <p className="text-sm text-muted-foreground">
              {projects && projects.length > 0
                ? "Select a project to view settings"
                : "No projects added yet"}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// Keep legacy export for backward compatibility
export const AgentsProjectWorktreeTab = AgentsProjectsTab
