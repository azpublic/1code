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

interface TaskListViewProps {
  tasks: TaskWithProject[]
  projects: Project[]
}

// Status icon component
const StatusIcon = memo(function StatusIcon({ status }: { status: TaskStatus }) {
  switch (status) {
    case "todo":
      return <Circle className="h-4 w-4 text-muted-foreground" />
    case "in-progress":
      return <CircleDot className="h-4 w-4 text-blue-500" />
    case "done":
      return <CheckCircle2 className="h-4 w-4 text-green-500" />
  }
})

// Priority badge
const PRIORITY_COLORS = {
  low: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  medium: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  high: "bg-red-500/10 text-red-500 border-red-500/20",
}

const PriorityBadge = memo(function PriorityBadge({ priority }: { priority: "low" | "medium" | "high" }) {
  return (
    <span className={cn(
      "text-xs px-2 py-1 rounded-md border",
      PRIORITY_COLORS[priority]
    )}>
      {priority}
    </span>
  )
})

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

const ProjectBadge = memo(function ProjectBadge({ project }: { project: Project }) {
  const color = getProjectColor(project.name)
  return (
    <span className={cn(
      "text-xs px-2 py-1 rounded-md border",
      color
    )}>
      {project.name}
    </span>
  )
})

// Task row component
const TaskRow = memo(function TaskRow({ task }: { task: TaskWithProject }) {
  return (
    <tr className="group border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer">
      {/* Status */}
      <td className="px-4 py-3">
        <StatusIcon status={task.status} />
      </td>

      {/* Title */}
      <td className="px-4 py-3">
        <div className="flex flex-col">
          <span className="text-sm font-medium text-foreground">
            {task.title}
          </span>
          {task.description && (
            <span className="text-xs text-muted-foreground line-clamp-1">
              {task.description}
            </span>
          )}
        </div>
      </td>

      {/* Project */}
      <td className="px-4 py-3">
        {task.project ? <ProjectBadge project={task.project} /> : <span className="text-xs text-muted-foreground">-</span>}
      </td>

      {/* Priority */}
      <td className="px-4 py-3">
        <PriorityBadge priority={task.priority} />
      </td>

      {/* Updated */}
      <td className="px-4 py-3 text-xs text-muted-foreground">
        {new Date(task.updatedAt).toLocaleDateString()}
      </td>
    </tr>
  )
})

export const TaskListView = memo(function TaskListView({
  tasks,
  projects,
}: TaskListViewProps) {
  if (tasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">No tasks yet</p>
          <p className="text-xs text-muted-foreground mt-1">Create your first task to get started</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto">
      {/* Centered table with max-width */}
      <div className="px-4 py-2 mx-auto max-w-4xl">
        <table className="w-full">
          {/* Header */}
          <thead className="sticky top-0 bg-background border-b border-border">
            <tr className="text-left text-xs text-muted-foreground uppercase tracking-wider">
              <th className="px-4 py-3 w-12"></th>
              <th className="px-4 py-3">Task</th>
              <th className="px-4 py-3 w-40">Project</th>
              <th className="px-4 py-3 w-28">Priority</th>
              <th className="px-4 py-3 w-28">Updated</th>
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            {tasks.map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
})
