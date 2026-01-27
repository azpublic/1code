import { useState } from "react"
import { CheckCircle2, Circle, Ellipsis, Pencil, Trash2, Loader2 } from "lucide-react"
import { useAtom } from "jotai"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu"
import { Button } from "../../../components/ui/button"
import { Badge } from "../../../components/ui/badge"
import { cn } from "../../../lib/utils"
import { trpc } from "../../../lib/trpc"
import { editingTaskAtom, taskFormDialogOpenAtom } from "../atoms"
import type { Task } from "@server/types"

interface TaskCardProps {
  task: Task
}

// Status colors for badge
const statusColors: Record<string, "default" | "secondary" | "outline"> = {
  todo: "outline",
  "in-progress": "default",
  done: "secondary",
}

// Priority colors
const priorityColors: Record<string, string> = {
  low: "text-blue-500",
  medium: "text-yellow-500",
  high: "text-red-500",
}

export function TaskCard({ task }: TaskCardProps) {
  const utils = trpc.useContext()
  const setEditingTask = useAtom(editingTaskAtom)[1]
  const setDialogOpen = useAtom(taskFormDialogOpenAtom)[1]

  const [isEditing, setIsEditing] = useState(false)
  const [editedTitle, setEditedTitle] = useState(task.title)

  // Update task mutation
  const updateTask = trpc.tasks.update.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate()
    },
  })

  // Delete task mutation
  const deleteTask = trpc.tasks.delete.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate()
    },
  })

  const handleStatusToggle = () => {
    const statusFlow: Record<string, string> = {
      todo: "in-progress",
      "in-progress": "done",
      done: "todo",
    }
    const newStatus = statusFlow[task.status] || "todo"
    updateTask.mutate({ id: task.id, status: newStatus as any })
  }

  const handleEdit = () => {
    setEditingTask({
      id: task.id,
      title: task.title,
      description: task.description || "",
      priority: (task.priority as any) || "medium",
    })
    setDialogOpen(true)
  }

  const handleDelete = () => {
    if (confirm("Delete this task?")) {
      deleteTask.mutate({ id: task.id })
    }
  }

  const handleTitleSubmit = () => {
    if (editedTitle.trim() && editedTitle !== task.title) {
      updateTask.mutate({ id: task.id, title: editedTitle.trim() })
    }
    setIsEditing(false)
  }

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleTitleSubmit()
    } else if (e.key === "Escape") {
      setEditedTitle(task.title)
      setIsEditing(false)
    }
  }

  const isLoading = updateTask.isPending || deleteTask.isPending

  return (
    <div
      className={cn(
        "group flex items-start gap-2 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors",
        isLoading && "opacity-50 pointer-events-none",
        task.status === "done" && "opacity-60",
      )}
    >
      {/* Status indicator - clickable to cycle through statuses */}
      <button
        onClick={handleStatusToggle}
        className="mt-0.5 flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
        disabled={isLoading}
      >
        {task.status === "done" ? (
          <CheckCircle2 className="h-5 w-5 text-green-500" />
        ) : task.status === "in-progress" ? (
          <Circle className="h-5 w-5 fill-yellow-500 text-yellow-500" />
        ) : (
          <Circle className="h-5 w-5" />
        )}
      </button>

      {/* Task content */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <input
            type="text"
            value={editedTitle}
            onChange={(e) => setEditedTitle(e.target.value)}
            onBlur={handleTitleSubmit}
            onKeyDown={handleTitleKeyDown}
            className="w-full bg-transparent border-none outline-none text-sm font-medium"
            autoFocus
            onFocus={(e) => e.target.select()}
          />
        ) : (
          <h4
            className="text-sm font-medium truncate cursor-text"
            onDoubleClick={() => setIsEditing(true)}
          >
            {task.title}
          </h4>
        )}

        {task.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
            {task.description}
          </p>
        )}

        {/* Task metadata */}
        <div className="flex items-center gap-2 mt-2">
          {/* Status badge */}
          <Badge variant={statusColors[task.status]} className="text-xs">
            {task.status === "in-progress" ? "In Progress" :
             task.status === "done" ? "Done" : "Todo"}
          </Badge>

          {/* Priority indicator */}
          <span
            className={cn(
              "text-xs font-medium",
              priorityColors[task.priority] || "text-muted-foreground"
            )}
          >
            {task.priority}
          </span>
        </div>
      </div>

      {/* Action menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Ellipsis className="h-4 w-4" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleEdit}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleDelete} className="text-destructive">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
