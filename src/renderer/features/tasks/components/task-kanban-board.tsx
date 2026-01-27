import { memo, useMemo } from "react"
import { Circle, CircleDot, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { TaskStatus } from "../atoms"
import type { Project } from "db/schema"

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

  return (
    <div className="group p-3 rounded-lg bg-background border border-border/50 hover:border-border transition-all cursor-pointer">
      {/* Title */}
      <p className="text-sm font-medium text-foreground mb-2 line-clamp-2">
        {task.title}
      </p>

      {/* Description (if exists) */}
      {task.description && (
        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
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
