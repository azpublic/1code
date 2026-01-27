import { memo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Columns3, X } from "lucide-react"
import { ListSearchIcon } from "@/components/ui/icons"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import type { TaskViewMode } from "../atoms"
import type { Project } from "db/schema"

interface TaskViewHeaderProps {
  viewMode: TaskViewMode
  onViewModeChange: (mode: TaskViewMode) => void
  viewFocus: string // "all" or projectId
  onViewFocusChange: (focus: string) => void
  projects: Project[]
  onCreateTask: () => void
  onClose: () => void
  tasksCount: number
  isLoading?: boolean
}

const ViewModeToggle = memo(function ViewModeToggle({
  viewMode,
  onChange,
}: {
  viewMode: TaskViewMode
  onChange: (mode: TaskViewMode) => void
}) {
  return (
    <div className="flex items-center bg-muted rounded-md p-0.5">
      <TooltipProvider>
        <Tooltip delayDuration={500}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onChange("kanban")}
              className={cn(
                "h-7 px-2 text-xs font-medium rounded-sm transition-all",
                viewMode === "kanban"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Columns3 className="h-3.5 w-3.5 mr-1.5" />
              Board
            </Button>
          </TooltipTrigger>
          <TooltipContent>Kanban board view</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <TooltipProvider>
        <Tooltip delayDuration={500}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onChange("list")}
              className={cn(
                "h-7 px-2 text-xs font-medium rounded-sm transition-all",
                viewMode === "list"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <ListSearchIcon className="h-3.5 w-3.5 mr-1.5" />
              List
            </Button>
          </TooltipTrigger>
          <TooltipContent>List table view</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
})

export const TaskViewHeader = memo(function TaskViewHeader({
  viewMode,
  onViewModeChange,
  viewFocus,
  onViewFocusChange,
  projects,
  onCreateTask,
  onClose,
  tasksCount,
  isLoading = false,
}: TaskViewHeaderProps) {
  return (
    <div className="flex-shrink-0 flex items-center justify-between px-3 py-2 border-b border-border/50 bg-background">
      {/* Left section: Title, View Toggle, Project Filter */}
      <div className="flex items-center gap-3">
        {/* Title */}
        <h1 className="text-sm font-semibold">Tasks</h1>

        {/* View Mode Toggle */}
        <ViewModeToggle viewMode={viewMode} onChange={onViewModeChange} />

        {/* Project Filter */}
        {projects.length > 0 && (
          <Select value={viewFocus} onValueChange={onViewFocusChange}>
            <SelectTrigger className="h-7 w-40 text-xs">
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Task count */}
        {!isLoading && (
          <span className="text-xs text-muted-foreground">
            {tasksCount} {tasksCount === 1 ? "task" : "tasks"}
          </span>
        )}
      </div>

      {/* Right section: Create, Close */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={onCreateTask}
          disabled={projects.length === 0}
          className="h-7 px-3 text-xs font-medium"
        >
          + New Task
        </Button>

        <TooltipProvider>
          <Tooltip delayDuration={500}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                aria-label="Close Tasks"
                className="h-6 w-6 p-0 hover:bg-foreground/10 text-muted-foreground hover:text-foreground rounded-md"
              >
                <X className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Close Tasks</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  )
})
