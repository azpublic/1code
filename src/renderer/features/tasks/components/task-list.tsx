import { useAtomValue } from "jotai"
import { taskFilterAtom, taskSortOrderAtom } from "../atoms"
import { trpc } from "../../../lib/trpc"
import { TaskCard } from "./task-card"
import { Skeleton } from "../../../components/ui/skeleton"
import { Circle } from "lucide-react"

interface TaskListProps {
  projectId?: string
}

// Sort functions
const sortFunctions = {
  "updated-desc": (a: any, b: any) =>
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  "updated-asc": (a: any, b: any) =>
    new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(),
  "priority-desc": (a: any, b: any) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 }
    return priorityOrder[a.priority] - priorityOrder[b.priority]
  },
  "priority-asc": (a: any, b: any) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 }
    return priorityOrder[b.priority] - priorityOrder[a.priority]
  },
}

export function TaskList({ projectId }: TaskListProps) {
  const filter = useAtomValue(taskFilterAtom)
  const sortOrder = useAtomValue(taskSortOrderAtom)

  const { data: tasks, isLoading } = trpc.tasks.list.useQuery(
    {
      projectId,
      status: filter === "all" ? undefined : filter,
    },
    {
      enabled: !!projectId,
    }
  )

  // Sort tasks client-side
  const sortedTasks = tasks
    ? [...tasks].sort(sortFunctions[sortOrder])
    : []

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-5 w-5 rounded-full" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!sortedTasks || sortedTasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <Circle className="h-12 w-12 text-muted-foreground/30 mb-3" />
        <p className="text-sm text-muted-foreground">
          {filter === "all"
            ? "No tasks yet. Create your first task to get started."
            : `No ${filter} tasks.`}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-1 p-2">
      {sortedTasks.map((task) => (
        <TaskCard key={task.id} task={task} />
      ))}
    </div>
  )
}
