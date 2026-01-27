import { useCallback, useMemo } from "react"
import { useAtom, useAtomValue, useSetAtom } from "jotai"
import { trpc } from "../../lib/trpc"
import {
  taskViewModeAtom,
  taskViewFocusAtom,
  taskViewVisibleAtom,
  taskFormDialogOpenAtom,
  editingTaskAtom,
} from "./atoms"
import { TaskViewHeader } from "./components/task-view-header"
import { TaskKanbanBoard } from "./components/task-kanban-board"
import { TaskListView } from "./components/task-list-view"
import { selectedProjectAtom } from "../agents/atoms"
import type { Project } from "db/schema"

interface TaskWithProject {
  id: string
  projectId: string
  title: string
  description: string | null
  status: "todo" | "in-progress" | "done"
  priority: "low" | "medium" | "high"
  planPath: string | null
  createdAt: Date
  updatedAt: Date
  completedAt: Date | null
  project?: Project
}

/**
 * Task View - Center screen task management with Kanban and List views
 * Shows tasks across all projects or filtered by single project
 */
export function TaskView() {
  const [viewMode, setViewMode] = useAtom(taskViewModeAtom)
  const [viewFocus, setViewFocus] = useAtom(taskViewFocusAtom)
  const setTaskViewVisible = useSetAtom(taskViewVisibleAtom)
  const setTaskFormDialogOpen = useSetAtom(taskFormDialogOpenAtom)
  const setEditingTask = useSetAtom(editingTaskAtom)
  const [selectedProject] = useAtom(selectedProjectAtom)

  // tRPC utils
  const utils = trpc.useUtils()

  // Fetch all projects
  const { data: projects } = trpc.projects.list.useQuery()

  // Fetch tasks - either all projects or focused project
  const projectIds = useMemo(() => {
    if (viewFocus === "all") {
      return projects?.map((p) => p.id) ?? []
    }
    return [viewFocus]
  }, [viewFocus, projects])

  // Fetch tasks
  const { data: tasks, isLoading: tasksLoading } = trpc.tasks.listByProjects.useQuery(
    { projectIds },
    { enabled: projectIds.length > 0 }
  )

  // Create projects map for task enrichment
  const projectsMap = useMemo(() => {
    if (!projects) return new Map<string, Project>()
    return new Map(projects.map((p) => [p.id, p]))
  }, [projects])

  // Enrich tasks with project data
  const enrichedTasks: TaskWithProject[] = useMemo(() => {
    if (!tasks) return []
    return tasks.map((task) => ({
      ...task,
      project: projectsMap.get(task.projectId),
    }))
  }, [tasks, projectsMap])

  // Handle create task
  const handleCreateTask = useCallback(() => {
    // Determine which project to create task for
    const projectId = viewFocus !== "all" ? viewFocus : selectedProject?.id

    if (!projectId) {
      // Show error - no project selected
      return
    }

    setEditingTask({
      id: null,
      title: "",
      description: "",
      priority: "medium",
    })
    setTaskFormDialogOpen(true)
  }, [viewFocus, selectedProject, setEditingTask, setTaskFormDialogOpen])

  // Handle close task view (return to chat)
  const handleCloseTaskView = useCallback(() => {
    setTaskViewVisible(false)
  }, [setTaskViewVisible])

  return (
    <div className="flex flex-col h-full w-full bg-background">
      {/* Header */}
      <TaskViewHeader
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        viewFocus={viewFocus}
        onViewFocusChange={setViewFocus}
        projects={projects ?? []}
        onCreateTask={handleCreateTask}
        onClose={handleCloseTaskView}
        tasksCount={enrichedTasks.length}
        isLoading={tasksLoading}
      />

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {viewMode === "kanban" ? (
          <TaskKanbanBoard
            tasks={enrichedTasks}
            projects={projects ?? []}
          />
        ) : (
          <TaskListView
            tasks={enrichedTasks}
            projects={projects ?? []}
          />
        )}
      </div>
    </div>
  )
}
