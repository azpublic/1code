"use client"

import { useState } from "react"
import { useAtom } from "jotai"
import { ChevronLeft, FolderOpen } from "lucide-react"

import { IconSpinner, GitHubIcon } from "../../components/ui/icons"
import { Logo } from "../../components/ui/logo"
import { Input } from "../../components/ui/input"
import { trpc } from "../../lib/trpc"
import { selectedProjectAtom } from "../agents/atoms"
import { showOfflineModeFeaturesAtom } from "../../lib/atoms"
import { useAtomValue } from "jotai"

// Helper component to render project icon (avatar or folder)
function ProjectIcon({
  gitOwner,
  gitProvider,
  className = "h-4 w-4",
  isOffline = false,
}: {
  gitOwner?: string | null
  gitProvider?: string | null
  className?: string
  isOffline?: boolean
}) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)

  const handleLoad = () => setIsLoaded(true)
  const handleError = () => setHasError(true)

  // In offline mode or on error, don't try to load remote images
  if (isOffline || hasError || !gitOwner || gitProvider !== "github") {
    return (
      <FolderOpen
        className={`${className} text-muted-foreground flex-shrink-0`}
      />
    )
  }

  return (
    <div className={`${className} relative flex-shrink-0`}>
      {/* Placeholder background while loading */}
      {!isLoaded && (
        <div className="absolute inset-0 rounded-sm bg-muted" />
      )}
      <img
        src={`https://github.com/${gitOwner}.png?size=64`}
        alt={gitOwner}
        className={`${className} rounded-sm flex-shrink-0 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  )
}

export function SelectRepoPage() {
  const [, setSelectedProject] = useAtom(selectedProjectAtom)
  const [showClonePage, setShowClonePage] = useState(false)
  const [githubUrl, setGithubUrl] = useState("")
  const [searchQuery, setSearchQuery] = useState("")

  // Check if offline mode is enabled and if we're actually offline
  const showOfflineFeatures = useAtomValue(showOfflineModeFeaturesAtom)
  const { data: ollamaStatus } = trpc.ollama.getStatus.useQuery(undefined, {
    enabled: showOfflineFeatures,
  })
  const isOffline = showOfflineFeatures && ollamaStatus ? !ollamaStatus.internet.online : false

  // Get tRPC utils for cache management
  const utils = trpc.useUtils()

  // Fetch existing projects from DB
  const { data: projects, isLoading: isLoadingProjects } = trpc.projects.list.useQuery()

  // Filter projects by search query
  const filteredProjects = projects?.filter((p) => {
    if (!searchQuery.trim()) return true
    const query = searchQuery.toLowerCase()
    return p.name.toLowerCase().includes(query) || p.path.toLowerCase().includes(query)
  }) ?? []

  // Open folder mutation
  const openFolder = trpc.projects.openFolder.useMutation({
    onSuccess: (project) => {
      console.log("[DEBUG] openFolder onSuccess called with:", project)
      if (project) {
        console.log("[DEBUG] Setting selectedProject:", project.id, project.name, project.path)
        // Optimistically update the projects list cache
        utils.projects.list.setData(undefined, (oldData) => {
          if (!oldData) return [project]
          const exists = oldData.some((p) => p.id === project.id)
          if (exists) {
            return oldData.map((p) =>
              p.id === project.id ? { ...p, updatedAt: project.updatedAt } : p
            )
          }
          return [project, ...oldData]
        })

        setSelectedProject({
          id: project.id,
          name: project.name,
          path: project.path,
          gitRemoteUrl: project.gitRemoteUrl,
          gitProvider: project.gitProvider as
            | "github"
            | "gitlab"
            | "bitbucket"
            | null,
          gitOwner: project.gitOwner,
          gitRepo: project.gitRepo,
        })
        console.log("[DEBUG] selectedProject set successfully")
      } else {
        console.log("[DEBUG] Project was null (user canceled dialog?)")
      }
    },
    onError: (err) => {
      console.error("[DEBUG] openFolder error:", err)
    },
  })

  // Clone from GitHub mutation
  const cloneFromGitHub = trpc.projects.cloneFromGitHub.useMutation({
    onSuccess: (project) => {
      if (project) {
        utils.projects.list.setData(undefined, (oldData) => {
          if (!oldData) return [project]
          const exists = oldData.some((p) => p.id === project.id)
          if (exists) {
            return oldData.map((p) =>
              p.id === project.id ? { ...p, updatedAt: project.updatedAt } : p
            )
          }
          return [project, ...oldData]
        })

        setSelectedProject({
          id: project.id,
          name: project.name,
          path: project.path,
          gitRemoteUrl: project.gitRemoteUrl,
          gitProvider: project.gitProvider as
            | "github"
            | "gitlab"
            | "bitbucket"
            | null,
          gitOwner: project.gitOwner,
          gitRepo: project.gitRepo,
        })
        setShowClonePage(false)
        setGithubUrl("")
      }
    },
  })

  const handleOpenFolder = async () => {
    await openFolder.mutateAsync()
  }

  const handleCloneFromGitHub = async () => {
    if (!githubUrl.trim()) return
    await cloneFromGitHub.mutateAsync({ repoUrl: githubUrl.trim() })
  }

  const handleSelectProject = (projectId: string) => {
    const project = projects?.find((p) => p.id === projectId)
    if (project) {
      setSelectedProject({
        id: project.id,
        name: project.name,
        path: project.path,
        gitRemoteUrl: project.gitRemoteUrl,
        gitProvider: project.gitProvider as
          | "github"
          | "gitlab"
          | "bitbucket"
          | null,
        gitOwner: project.gitOwner,
        gitRepo: project.gitRepo,
      })
    }
  }

  const handleBack = () => {
    if (cloneFromGitHub.isPending) return
    setShowClonePage(false)
    setGithubUrl("")
  }

  // Clone from GitHub page
  if (showClonePage) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-background select-none">
        {/* Draggable title bar area */}
        <div
          className="fixed top-0 left-0 right-0 h-10"
          style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
        />

        {/* Back button */}
        <button
          onClick={handleBack}
          disabled={cloneFromGitHub.isPending}
          className="fixed top-12 left-4 flex items-center justify-center h-8 w-8 rounded-full hover:bg-foreground/5 transition-colors disabled:opacity-50"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <div className="w-full max-w-[440px] space-y-8 px-4">
          {/* Header with dual icons */}
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2 p-2 mx-auto w-max rounded-full border border-border">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                <Logo className="w-5 h-5" fill="white" />
              </div>
              <div className="w-10 h-10 rounded-full bg-foreground flex items-center justify-center">
                <GitHubIcon className="w-5 h-5 text-background" />
              </div>
            </div>
            <div className="space-y-1">
              <h1 className="text-base font-semibold tracking-tight">
                Clone from GitHub
              </h1>
              <p className="text-sm text-muted-foreground">
                Enter a repository URL or owner/repo
              </p>
            </div>
          </div>

          {/* Input */}
          <div className="space-y-4">
            <div className="relative">
              <Input
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && githubUrl.trim()) {
                    handleCloneFromGitHub()
                  }
                }}
                placeholder="owner/repo"
                className="text-center pr-10"
                autoFocus
                disabled={cloneFromGitHub.isPending}
              />
              {cloneFromGitHub.isPending && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <IconSpinner className="h-4 w-4" />
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Example: facebook/react or https://github.com/facebook/react
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Main select repo page
  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-background select-none">
      {/* Draggable title bar area */}
      <div
        className="fixed top-0 left-0 right-0 h-10"
        style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
      />

      <div className="w-full max-w-[500px] space-y-6 px-4">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center mx-auto w-max">
            <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
              <Logo className="w-6 h-6" fill="white" />
            </div>
          </div>
          <div className="space-y-1">
            <h1 className="text-base font-semibold tracking-tight">
              Select a repository
            </h1>
            <p className="text-sm text-muted-foreground">
              Choose a local folder or select an existing project
            </p>
          </div>
        </div>

        {/* Existing Projects List */}
        {!isLoadingProjects && filteredProjects.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground px-1">Recent projects</p>
            <div className="max-h-[200px] overflow-y-auto rounded-lg border border-border/50 bg-muted/30">
              {filteredProjects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => handleSelectProject(project.id)}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/50 transition-colors text-left border-b border-border/30 last:border-0"
                >
                  <ProjectIcon
                    gitOwner={project.gitOwner}
                    gitProvider={project.gitProvider}
                    isOffline={isOffline}
                    className="h-4 w-4"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{project.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{project.path}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Search input when there are projects */}
        {!isLoadingProjects && (projects?.length ?? 0) > 0 && (
          <div className="relative">
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 px-3 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleOpenFolder}
            disabled={openFolder.isPending}
            className="w-full h-8 px-4 bg-primary text-primary-foreground rounded-lg text-sm font-medium transition-[background-color,transform] duration-150 hover:bg-primary/90 active:scale-[0.97] shadow-[0_0_0_0.5px_rgb(23,23,23),inset_0_0_0_1px_rgba(255,255,255,0.14)] dark:shadow-[0_0_0_0.5px_rgb(23,23,23),inset_0_0_0_1px_rgba(255,255,255,0.14)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {openFolder.isPending ? (
              <IconSpinner className="h-4 w-4" />
            ) : (
              "Select folder"
            )}
          </button>
          <button
            onClick={() => setShowClonePage(true)}
            disabled={cloneFromGitHub.isPending}
            className="w-full h-8 px-4 bg-muted text-foreground rounded-lg text-sm font-medium transition-[background-color,transform] duration-150 hover:bg-muted/80 active:scale-[0.97] shadow-[0_0_0_0.5px_rgb(23,23,23),inset_0_0_0_1px_rgba(255,255,255,0.06)] dark:shadow-[0_0_0_0.5px_rgb(23,23,23),inset_0_0_0_1px_rgba(255,255,255,0.06)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {cloneFromGitHub.isPending ? (
              <IconSpinner className="h-4 w-4" />
            ) : (
              "Clone from GitHub"
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
