import { useEffect, useRef } from "react"
import { useQueryClient } from "@tanstack/react-query"

/**
 * Hook that listens for file changes from Claude Write/Edit tools
 * and invalidates the git status query to trigger a refetch
 */
export function useFileChangeListener(worktreePath: string | null | undefined) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!worktreePath) return

    const cleanup = window.desktopApi?.onFileChanged((data) => {
      // Check if the changed file is within our worktree
      if (data.filePath.startsWith(worktreePath)) {
        // Invalidate git status queries to trigger refetch
        queryClient.invalidateQueries({
          queryKey: [["changes", "getStatus"]],
        })
      }
    })

    return () => {
      cleanup?.()
    }
  }, [worktreePath, queryClient])
}

/**
 * Hook that subscribes to the GitWatcher for real-time file system monitoring.
 * Uses chokidar on the main process for efficient file watching.
 * Automatically invalidates git status queries when files change.
 */
export function useGitWatcher(worktreePath: string | null | undefined) {
  const queryClient = useQueryClient()
  const isSubscribedRef = useRef(false)

  useEffect(() => {
    if (!worktreePath) return

    // Subscribe to git watcher on main process
    const subscribe = async () => {
      try {
        await window.desktopApi?.subscribeToGitWatcher(worktreePath)
        isSubscribedRef.current = true
      } catch (error) {
        console.error("[useGitWatcher] Failed to subscribe:", error)
      }
    }

    subscribe()

    // Listen for git status changes from the watcher
    const cleanup = window.desktopApi?.onGitStatusChanged((data) => {
      // DIAGNOSTIC: Log git watcher event received
      console.log('[useGitWatcher] GIT STATUS CHANGED - worktree:', data.worktreePath, 'changes:', data.changes.length)
      console.log('[useGitWatcher] Call stack:', new Error().stack?.split('\n').slice(2, 5).join('\n'))

      if (data.worktreePath === worktreePath) {
        // DIAGNOSTIC: About to invalidate queries
        console.log('[useGitWatcher] Invalidating getStatus queries')
        queryClient.invalidateQueries({
          queryKey: [["changes", "getStatus"]],
        })

        // Also invalidate parsed diff if files were modified
        const hasModifiedFiles = data.changes.some(
          (change) => change.type === "change" || change.type === "add"
        )
        if (hasModifiedFiles) {
          console.log('[useGitWatcher] Invalidating getParsedDiff queries')
          queryClient.invalidateQueries({
            queryKey: [["changes", "getParsedDiff"]],
          })
        }
      }
    })

    return () => {
      cleanup?.()

      // Unsubscribe from git watcher
      if (isSubscribedRef.current) {
        window.desktopApi?.unsubscribeFromGitWatcher(worktreePath).catch((error) => {
          console.error("[useGitWatcher] Failed to unsubscribe:", error)
        })
        isSubscribedRef.current = false
      }
    }
  }, [worktreePath, queryClient])
}
