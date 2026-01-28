import { useEffect, useState } from "react"
import { useAtom, useSetAtom } from "jotai"
import { Loader2, Trash2, MessageCircle } from "lucide-react"
import { toast } from "sonner"
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
import { taskFormDialogOpenAtom, editingTaskAtom, taskViewVisibleAtom } from "../atoms"
import type { TaskPriority } from "../atoms"
import { selectedAgentChatIdAtom } from "../../../features/agents/atoms"

interface TaskFormProps {
  projectId?: string
}

export function TaskForm({ projectId: propProjectId }: TaskFormProps) {
  const utils = trpc.useContext()
  const [isOpen, setIsOpen] = useAtom(taskFormDialogOpenAtom)
  const [editingTask] = useAtom(editingTaskAtom)
  const setSelectedAgentChatId = useSetAtom(selectedAgentChatIdAtom)
  const setTaskViewVisible = useSetAtom(taskViewVisibleAtom)

  // Fetch all projects for the dropdown
  const { data: projects } = trpc.projects.list.useQuery()

  // Form state
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState<TaskPriority>("medium")
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(propProjectId ?? null)

  // Create task mutation
  const createTask = trpc.tasks.create.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate()
      utils.tasks.listByProjects.invalidate()
      handleClose()
    },
  })

  // Update task mutation
  const updateTask = trpc.tasks.update.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate()
      utils.tasks.listByProjects.invalidate()
      handleClose()
    },
  })

  // Delete task mutation
  const deleteTask = trpc.tasks.delete.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate()
      utils.tasks.listByProjects.invalidate()
      handleClose()
    },
  })

  // Create chat from task mutation
  const createChatFromTask = trpc.tasks.createChatFromTask.useMutation({
    onSuccess: (data) => {
      console.log("[TaskForm] Chat created successfully:", data.id)
      utils.tasks.list.invalidate()
      utils.tasks.listByProjects.invalidate()
      utils.chats.list.invalidate()
      // Navigate to the new chat, close dialog and task view
      setSelectedAgentChatId(data.id)
      setTaskViewVisible(false)
      handleClose()
      toast.success("Chat created from task")
    },
    onError: (error) => {
      console.error("[TaskForm] Failed to create chat:", error)
      toast.error(`Failed to create chat: ${error.message}`)
    },
  })

  // Load editing task data
  useEffect(() => {
    if (editingTask) {
      setTitle(editingTask.title)
      setDescription(editingTask.description)
      setPriority(editingTask.priority)
      setSelectedProjectId(editingTask.projectId)
    } else {
      setTitle("")
      setDescription("")
      setPriority("medium")
      // When creating new, use propProjectId if available
      setSelectedProjectId(propProjectId ?? null)
    }
  }, [editingTask, propProjectId])

  // Reset selected project when propProjectId changes (for new tasks)
  useEffect(() => {
    if (!editingTask?.id && propProjectId) {
      setSelectedProjectId(propProjectId)
    }
  }, [propProjectId, editingTask?.id])

  const handleClose = () => {
    setIsOpen(false)
    // Reset editing task after dialog closes
    setTimeout(() => {
      setTitle("")
      setDescription("")
      setPriority("medium")
      setSelectedProjectId(propProjectId ?? null)
    }, 200)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) return

    if (editingTask?.id) {
      // Update existing task - include projectId if changed
      updateTask.mutate({
        id: editingTask.id,
        projectId: selectedProjectId ?? undefined,
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
      })
    } else if (selectedProjectId) {
      // Create new task
      createTask.mutate({
        projectId: selectedProjectId,
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
      })
    }
  }

  const handleDelete = () => {
    if (editingTask?.id && confirm("Are you sure you want to delete this task?")) {
      deleteTask.mutate({ id: editingTask.id })
    }
  }

  const handleCreateChatFromTask = () => {
    if (editingTask?.id) {
      createChatFromTask.mutate({ taskId: editingTask.id, mode: "plan" })
    }
  }

  const isLoading = createTask.isPending || updateTask.isPending || deleteTask.isPending || createChatFromTask.isPending
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

            {/* Project - always visible, can be changed when editing */}
            <div className="space-y-2">
              <Label htmlFor="project">Project *</Label>
              <Select
                value={selectedProjectId ?? ""}
                onValueChange={(v) => setSelectedProjectId(v)}
                disabled={isLoading}
              >
                <SelectTrigger id="project">
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {projects?.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            {isEditMode && (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleCreateChatFromTask}
                  disabled={isLoading}
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Open in Chat
                </Button>
                <div className="flex-1" />
              </>
            )}
            {isEditMode && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={isLoading}
                className="mr-auto"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !title.trim() || (!isEditMode && !selectedProjectId)}>
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
