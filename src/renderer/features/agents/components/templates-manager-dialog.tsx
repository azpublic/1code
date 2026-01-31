"use client"

import { AnimatePresence, motion } from "motion/react"
import { useEffect, useState, useRef } from "react"
import { createPortal } from "react-dom"
import { Button } from "../../../components/ui/button"
import { Input } from "../../../components/ui/input"
import { Textarea } from "../../../components/ui/textarea"
import { trpc } from "../../../lib/trpc"
import { Trash2, Edit, Plus, Search } from "lucide-react"

const EASING_CURVE = [0.55, 0.055, 0.675, 0.19] as const
const INTERACTION_DELAY_MS = 250

interface Template {
  id: string
  title: string
  content: string
  category?: string | null
  createdAt: Date
  updatedAt: Date
  usageCount: number
}

interface TemplatesManagerDialogProps {
  isOpen: boolean
  onClose: () => void
  onInsertTemplate: (templateId: string, content: string) => void
}

export function TemplatesManagerDialog({
  isOpen,
  onClose,
  onInsertTemplate,
}: TemplatesManagerDialogProps) {
  const [mounted, setMounted] = useState(false)
  const [search, setSearch] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ title: "", content: "", category: "" })
  const [isCreateMode, setIsCreateMode] = useState(false)
  const [createForm, setCreateForm] = useState({ title: "", content: "", category: "" })
  const openAtRef = useRef<number>(0)

  const utils = trpc.useUtils()

  // Query templates with search/filter
  const { data: templates = [], isLoading } = trpc.templates.list.useQuery(
    { search: search || undefined },
    { enabled: isOpen }
  )

  // Create mutation
  const createMutation = trpc.templates.create.useMutation({
    onSuccess: () => {
      utils.templates.list.invalidate()
      setCreateForm({ title: "", content: "", category: "" })
      setIsCreateMode(false)
    },
  })

  // Update mutation
  const updateMutation = trpc.templates.update.useMutation({
    onSuccess: () => {
      utils.templates.list.invalidate()
      setEditingId(null)
      setEditForm({ title: "", content: "", category: "" })
    },
  })

  // Delete mutation
  const deleteMutation = trpc.templates.delete.useMutation({
    onSuccess: () => {
      utils.templates.list.invalidate()
    },
  })

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (isOpen) {
      openAtRef.current = performance.now()
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        handleClose()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isOpen])

  const handleClose = () => {
    const canInteract = performance.now() - openAtRef.current > INTERACTION_DELAY_MS
    if (!canInteract || createMutation.isPending || updateMutation.isPending || deleteMutation.isPending) {
      return
    }
    setIsCreateMode(false)
    setEditingId(null)
    onClose()
  }

  const handleCreate = async () => {
    if (!createForm.title.trim() || !createForm.content.trim()) return
    await createMutation.mutateAsync(createForm)
  }

  const handleUpdate = async () => {
    if (!editingId || !editForm.title.trim() || !editForm.content.trim()) return
    await updateMutation.mutateAsync({
      id: editingId,
      ...editForm,
    })
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return
    await deleteMutation.mutateAsync({ id })
  }

  const startEdit = (template: Template) => {
    setEditingId(template.id)
    setEditForm({
      title: template.title,
      content: template.content,
      category: template.category || "",
    })
    setIsCreateMode(false)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm({ title: "", content: "", category: "" })
  }

  const handleInsert = (template: Template) => {
    onInsertTemplate(template.id, template.content)
    handleClose()
  }

  if (!mounted) return null

  const portalTarget = typeof document !== "undefined" ? document.body : null
  if (!portalTarget) return null

  return createPortal(
    <AnimatePresence mode="wait" initial={false}>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.18, ease: EASING_CURVE } }}
            exit={{ opacity: 0, pointerEvents: "none" as const, transition: { duration: 0.15, ease: EASING_CURVE } }}
            className="fixed inset-0 z-[45] bg-black/25"
            onClick={handleClose}
            style={{ pointerEvents: "auto" }}
            data-modal="templates-manager"
          />

          {/* Main Dialog */}
          <div className="fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] z-[46] pointer-events-none">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2, ease: EASING_CURVE }}
              className="w-[90vw] max-w-[600px] pointer-events-auto max-h-[80vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-background rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[80vh]" data-canvas-dialog>
                {/* Header */}
                <div className="p-6 border-b border-border">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold">Prompt Templates</h2>
                    <Button
                      onClick={() => setIsCreateMode(true)}
                      variant="default"
                      size="sm"
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      New Template
                    </Button>
                  </div>

                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search templates..."
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Content - Scrollable */}
                <div className="flex-1 overflow-y-auto p-6">
                  {isLoading ? (
                    <div className="text-center text-muted-foreground py-8">Loading templates...</div>
                  ) : templates.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      {search ? "No templates found" : "No templates yet. Create your first one!"}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {templates.map((template) => (
                        <div
                          key={template.id}
                          className="border rounded-lg p-4 hover:bg-muted/50 transition-colors group"
                        >
                          {editingId === template.id ? (
                            // Edit mode
                            <div className="space-y-3">
                              <Input
                                value={editForm.title}
                                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                                placeholder="Template title"
                                className="font-medium"
                              />
                              <Input
                                value={editForm.category}
                                onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                                placeholder="Category (optional)"
                                className="text-sm"
                              />
                              <Textarea
                                value={editForm.content}
                                onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                                placeholder="Template content"
                                className="min-h-[100px] text-sm"
                              />
                              <div className="flex gap-2 justify-end">
                                <Button
                                  onClick={cancelEdit}
                                  variant="ghost"
                                  size="sm"
                                  disabled={updateMutation.isPending}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  onClick={handleUpdate}
                                  variant="default"
                                  size="sm"
                                  disabled={updateMutation.isPending || !editForm.title.trim() || !editForm.content.trim()}
                                >
                                  {updateMutation.isPending ? "Saving..." : "Save"}
                                </Button>
                              </div>
                            </div>
                          ) : (
                            // View mode
                            <>
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-medium truncate">{template.title}</h3>
                                    {template.category && (
                                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                                        {template.category}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground line-clamp-2">
                                    {template.content}
                                  </p>
                                  {template.usageCount > 0 && (
                                    <div className="text-xs text-muted-foreground mt-2">
                                      Used {template.usageCount} {template.usageCount === 1 ? "time" : "times"}
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button
                                    onClick={() => handleInsert(template)}
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    title="Insert into chat"
                                  >
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    onClick={() => startEdit(template)}
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    title="Edit"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    onClick={() => handleDelete(template.id)}
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                    title="Delete"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Create form */}
                  {isCreateMode && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <h4 className="font-medium mb-3">Create New Template</h4>
                      <div className="space-y-3">
                        <Input
                          value={createForm.title}
                          onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                          placeholder="Template title"
                        />
                        <Input
                          value={createForm.category}
                          onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
                          placeholder="Category (optional)"
                        />
                        <Textarea
                          value={createForm.content}
                          onChange={(e) => setCreateForm({ ...createForm, content: e.target.value })}
                          placeholder="Template content"
                          className="min-h-[100px]"
                        />
                        <div className="flex gap-2 justify-end">
                          <Button
                            onClick={() => setIsCreateMode(false)}
                            variant="ghost"
                            size="sm"
                            disabled={createMutation.isPending}
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleCreate}
                            variant="default"
                            size="sm"
                            disabled={createMutation.isPending || !createForm.title.trim() || !createForm.content.trim()}
                          >
                            {createMutation.isPending ? "Creating..." : "Create"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="bg-muted p-4 flex justify-end border-t border-border rounded-b-xl">
                  <Button onClick={handleClose} variant="ghost" className="rounded-md">
                    Close
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    portalTarget,
  )
}
