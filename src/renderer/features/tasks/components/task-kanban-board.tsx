import { memo, useMemo, useCallback, useState } from "react"
import { Circle, CircleDot, CheckCircle2, Ellipsis, MessageCircle, GitBranch, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useSetAtom } from "jotai"
import type { TaskStatus } from "../atoms"
import { editingTaskAtom, taskFormDialogOpenAtom, taskViewVisibleAtom } from "../atoms"
import type { Project } from "db/schema"
import { trpc } from "../../../lib/trpc"
import { selectedAgentChatIdAtom } from "../../agents/atoms"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu"
import { Button } from "../../../components/ui/button"
import { toast } from "sonner"

interface TaskWithProject {
  id: string
  projectId: string
  title: string
  description: string | null
  status: TaskStatus
  priority: "low" | "medium" | "high"
  planPath: string | null
  createdAt: Date
  updatedAt: Date
  completedAt: Date | null
  project?: Project
}

interface TaskKanbanBoardProps {
  tasks: TaskWithProject[]
  projects: Project[]
}

// 3 columns for tasks
const COLUMNS: { status: TaskStatus; title: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { status: "todo", title: "To Do", icon: Circle },
  { status: "in-progress", title: "In Progress", icon: CircleDot },
  { status: "done", title: "Done", icon: CheckCircle2 },
]

// Priority colors
const PRIORITY_COLORS = {
  low: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  medium: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  high: "bg-red-500/10 text-red-500 border-red-500/20",
}

// Generate consistent color from project name
function getProjectColor(name: string): string {
  const colors = [
    "bg-purple-500/10 text-purple-500 border-purple-500/20",
    "bg-blue-500/10 text-blue-500 border-blue-500/20",
    "bg-green-500/10 text-green-500 border-green-500/20",
    "bg-orange-500/10 text-orange-500 border-orange-500/20",
    "bg-pink-500/10 text-pink-500 border-pink-500/20",
    "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
    "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
    "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

const TaskCard = memo(function TaskCard({ task }: { task: TaskWithProject }) {
  const priorityColor = PRIORITY_COLORS[task.priority]
  const projectColor = task.project ? getProjectColor(task.project.name) : null
  const setEditingTask = useSetAtom(editingTaskAtom)
  const setDialogOpen = useSetAtom(taskFormDialogOpenAtom)
  const setSelectedAgentChatId = useSetAtom(selectedAgentChatIdAtom)
  const setTaskViewVisible = useSetAtom(taskViewVisibleAtom)
  const utils = trpc.useContext()

  const [isMenuOpen, setIsMenuOpen] = useState(false)

  // Create chat from task mutation
  const createChatFromTask = trpc.tasks.createChatFromTask.useMutation({
    onSuccess: (data) => {
      console.log("[TaskCard] Chat created successfully:", data.id)
      utils.tasks.list.invalidate()
      utils.tasks.listByProjects.invalidate()
      utils.chats.list.invalidate()
      // Navigate to the new chat and close task view
      setSelectedAgentChatId(data.id)
      setTaskViewVisible(false)
      setIsMenuOpen(false)
      toast.success("Chat created from task")
    },
    onError: (error) => {
      console.error("[TaskCard] Failed to create chat:", error)
      toast.error(`Failed to create chat: ${error.message}`)
      setIsMenuOpen(false)
    },
  })

  const handleEdit = useCallback(() => {
    console.log("[Kanban TaskCard] Edit clicked!", { taskId: task.id })
    setEditingTask({
      id: task.id,
      projectId: task.projectId,
      title: task.title,
      description: task.description || "",
      priority: task.priority,
    })
    setDialogOpen(true)
    setIsMenuOpen(false)
    console.log("[Kanban TaskCard] Dialog should be open")
  }, [task, setEditingTask, setDialogOpen])

  const handleTakeToPlanChat = useCallback(() => {
    console.log("[Kanban TaskCard] Plan with AI clicked:", task.id)
    createChatFromTask.mutate({ taskId: task.id, mode: "plan" })
  }, [task.id, createChatFromTask])

  const handleStartWorkspace = useCallback(() => {
    console.log("[Kanban TaskCard] Start Workspace clicked:", task.id)
    createChatFromTask.mutate({ taskId: task.id, mode: "agent" })
  }, [task.id, createChatFromTask])

  const isLoading = createChatFromTask.isPending

  return (
    <div
      className="group p-3 rounded-lg bg-background border border-border/50 hover:border-border transition-all"
    >
      {/* Header with title and menu button */}
      <div className="flex items-start gap-2">
        {/* Title - clickable to edit */}
        <p
          onClick={handleEdit}
          className="text-sm font-medium text-foreground mb-2 line-clamp-2 flex-1 cursor-pointer hover:text-primary/80 transition-colors"
        >
          {task.title}
        </p>

        {/* Menu button */}
        <DropdownMenu onOpenChange={setIsMenuOpen} open={isMenuOpen}>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
            >
              {isLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Ellipsis className="h-3.5 w-3.5" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem onClick={handleTakeToPlanChat} disabled={isLoading}>
              <MessageCircle className="h-3.5 w-3.5 mr-2" />
              Plan with AI
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleStartWorkspace} disabled={isLoading}>
              <GitBranch className="h-3.5 w-3.5 mr-2" />
              Start Workspace
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleEdit}>
              <Ellipsis className="h-3.5 w-3.5 mr-2" />
              Edit
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Description (if exists) */}
      {task.description && (
        <p onClick={handleEdit} className="text-xs text-muted-foreground mb-2 line-clamp-2 cursor-pointer">
          {task.description}
        </p>
      )}

      {/* Footer: Priority badge + Project badge */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Priority badge */}
        <span className={cn(
          "text-xs px-1.5 py-0.5 rounded border",
          priorityColor
        )}>
          {task.priority}
        </span>

        {/* Project badge */}
        {task.project && projectColor && (
          <span className={cn(
            "text-xs px-1.5 py-0.5 rounded border",
            projectColor
          )}>
            {task.project.name}
          </span>
        )}
      </div>
    </div>
  )
})

const TaskColumn = memo(function TaskColumn({
  title,
  status,
  icon: Icon,
  tasks,
}: {
  title: string
  status: TaskStatus
  icon: React.ComponentType<{ className?: string }>
  tasks: TaskWithProject[]
}) {
  return (
    <div className="flex-1 min-w-[280px] max-w-[350px] flex flex-col h-full bg-muted/30 rounded-lg border border-border/50">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/50">
        <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <h3 className="text-sm font-medium">{title}</h3>
        <span className="text-xs text-muted-foreground ml-auto">
          {tasks.length}
        </span>
      </div>

      {/* Tasks */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {tasks.length === 0 ? (
          <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
            No tasks
          </div>
        ) : (
          tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))
        )}
      </div>
    </div>
  )
})

export const TaskKanbanBoard = memo(function TaskKanbanBoard({
  tasks,
  projects,
}: TaskKanbanBoardProps) {
  // Group tasks by status
  const tasksByStatus = useMemo(() => {
    const grouped: Record<TaskStatus, TaskWithProject[]> = {
      "todo": [],
      "in-progress": [],
      "done": [],
    }

    for (const task of tasks) {
      grouped[task.status].push(task)
    }

    return grouped
  }, [tasks])

  return (
    <div className="h-full overflow-x-auto">
      {/* Centered container with max-width */}
      <div className="flex gap-3 h-full px-4 py-2 mx-auto max-w-5xl min-w-min">
        {COLUMNS.map((column) => (
          <TaskColumn
            key={column.status}
            title={column.title}
            status={column.status}
            icon={column.icon}
            tasks={tasksByStatus[column.status]}
          />
        ))}
      </div>
    </div>
  )
})
