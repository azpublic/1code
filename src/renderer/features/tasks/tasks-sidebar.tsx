import { useAtom, useAtomValue, useSetAtom } from "jotai"
import { Plus, Filter, ArrowUpDown, X } from "lucide-react"
import { Button } from "../../components/ui/button"
import { Badge } from "../../components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "../../components/ui/dropdown-menu"
import { TaskList } from "./components/task-list"
import { TaskForm } from "./components/task-form"
import {
  tasksSidebarOpenAtom,
  taskFilterAtom,
  taskSortOrderAtom,
  taskFormDialogOpenAtom,
  editingTaskAtom,
  type TaskFilter,
  type TaskSortOrder,
} from "./atoms"
import { selectedProjectAtom } from "../agents/atoms"

// Filter options
const filterOptions: { value: TaskFilter; label: string }[] = [
  { value: "all", label: "All Tasks" },
  { value: "todo", label: "Todo" },
  { value: "in-progress", label: "In Progress" },
  { value: "done", label: "Done" },
]

// Sort options
const sortOptions: { value: TaskSortOrder; label: string }[] = [
  { value: "updated-desc", label: "Recently Updated" },
  { value: "updated-asc", label: "Least Recently Updated" },
  { value: "priority-desc", label: "Highest Priority" },
  { value: "priority-asc", label: "Lowest Priority" },
]

export function TasksSidebar() {
  const [isOpen, setIsOpen] = useAtom(tasksSidebarOpenAtom)
  const [filter, setFilter] = useAtom(taskFilterAtom)
  const [sortOrder, setSortOrder] = useAtom(taskSortOrderAtom)
  const setDialogOpen = useSetAtom(taskFormDialogOpenAtom)
  const setEditingTask = useSetAtom(editingTaskAtom)
  const [selectedProject] = useAtom(selectedProjectAtom)

  const handleCreateTask = () => {
    setEditingTask(null)
    setDialogOpen(true)
  }

  const taskCount = 0 // Will be updated by the query

  if (!isOpen) return null

  return (
    <>
      <div className="flex flex-col h-full bg-background border-l">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold">Tasks</h2>
            {selectedProject && (
              <Badge variant="secondary" className="text-xs">
                {selectedProject.name}
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Filters and Sort */}
        <div className="flex items-center gap-2 px-4 py-2 border-b">
          <Select value={filter} onValueChange={(v) => setFilter(v as TaskFilter)}>
            <SelectTrigger className="h-8 text-xs">
              <Filter className="h-3 w-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {filterOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs">
                <ArrowUpDown className="h-3 w-3 mr-1" />
                Sort
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {sortOptions.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => setSortOrder(option.value)}
                >
                  {option.label}
                  {sortOrder === option.value && (
                    <span className="ml-auto text-muted-foreground">✓</span>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Task List */}
        {selectedProject ? (
          <div className="flex-1 overflow-y-auto">
            <TaskList projectId={selectedProject.id} />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-4 text-center">
            <p className="text-sm text-muted-foreground">
              Select a project to view tasks
            </p>
          </div>
        )}

        {/* Footer - Add Task Button */}
        {selectedProject && (
          <div className="p-3 border-t">
            <Button
              onClick={handleCreateTask}
              className="w-full"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-1" />
              New Task
            </Button>
          </div>
        )}
      </div>

      {/* Task Form Dialog */}
      <TaskForm projectId={selectedProject?.id} />
    </>
  )
}
