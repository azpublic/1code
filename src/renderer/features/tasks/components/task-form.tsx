import { useEffect, useState } from "react"
import { useAtom } from "jotai"
import { Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../../components/ui/dialog"
import { Button } from "../../../components/ui/button"
import { Input } from "../../../components/ui/input"
import { Textarea } from "../../../components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select"
import { Label } from "../../../components/ui/label"
import { trpc } from "../../../lib/trpc"
import { taskFormDialogOpenAtom, editingTaskAtom } from "../atoms"
import type { TaskPriority } from "../atoms"

interface TaskFormProps {
  projectId?: string
}

export function TaskForm({ projectId }: TaskFormProps) {
  const utils = trpc.useContext()
  const [isOpen, setIsOpen] = useAtom(taskFormDialogOpenAtom)
  const [editingTask] = useAtom(editingTaskAtom)

  // Form state
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState<TaskPriority>("medium")

  // Create task mutation
  const createTask = trpc.tasks.create.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate()
      handleClose()
    },
  })

  // Update task mutation
  const updateTask = trpc.tasks.update.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate()
      handleClose()
    },
  })

  // Load editing task data
  useEffect(() => {
    if (editingTask) {
      setTitle(editingTask.title)
      setDescription(editingTask.description)
      setPriority(editingTask.priority)
    } else {
      setTitle("")
      setDescription("")
      setPriority("medium")
    }
  }, [editingTask])

  const handleClose = () => {
    setIsOpen(false)
    // Reset editing task after dialog closes
    setTimeout(() => {
      setTitle("")
      setDescription("")
      setPriority("medium")
    }, 200)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) return

    if (editingTask?.id) {
      // Update existing task
      updateTask.mutate({
        id: editingTask.id,
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
      })
    } else if (projectId) {
      // Create new task
      createTask.mutate({
        projectId,
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
      })
    }
  }

  const isLoading = createTask.isPending || updateTask.isPending
  const isEditMode = !!editingTask?.id

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? "Edit Task" : "Create New Task"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What needs to be done?"
                disabled={isLoading}
                autoFocus
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add more details..."
                rows={3}
                disabled={isLoading}
              />
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={priority}
                onValueChange={(v) => setPriority(v as TaskPriority)}
                disabled={isLoading}
              >
                <SelectTrigger id="priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !title.trim()}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {isEditMode ? "Saving..." : "Creating..."}
                </>
              ) : isEditMode ? (
                "Save Changes"
              ) : (
                "Create Task"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
