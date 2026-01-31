"use client"

import { useEffect, useState } from "react"
import { Popover, PopoverContent, PopoverTrigger } from "../../../components/ui/popover"
import { Button } from "../../../components/ui/button"
import { Input } from "../../../components/ui/input"
import { trpc } from "../../../lib/trpc"
import { FileText, Search } from "lucide-react"
import { cn } from "../../../lib/utils"

interface Template {
  id: string
  title: string
  content: string
  category?: string | null
}

interface TemplateSelectorPopoverProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onSelectTemplate: (templateId: string, content: string) => void
  trigger?: React.ReactNode
}

export function TemplateSelectorPopover({
  isOpen,
  onOpenChange,
  onSelectTemplate,
  trigger,
}: TemplateSelectorPopoverProps) {
  const [search, setSearch] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)

  const { data: templates = [] } = trpc.templates.list.useQuery(
    { search: search || undefined },
    { enabled: isOpen }
  )

  const recordUsage = trpc.templates.recordUsage.useMutation({
    onSuccess: () => {
      // Invalidate list to update usage counts
      trpc.useUtils().templates.list.invalidate()
    },
  })

  // Reset selection when search changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [search, templates])

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setSelectedIndex((i) => Math.min(i + 1, templates.length - 1))
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        setSelectedIndex((i) => Math.max(i - 1, 0))
      } else if (e.key === "Enter" && templates[selectedIndex]) {
        e.preventDefault()
        handleSelect(templates[selectedIndex])
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, templates, selectedIndex])

  const handleSelect = (template: Template) => {
    onSelectTemplate(template.id, template.content)
    recordUsage.mutate({ id: template.id })
    onOpenChange(false)
    setSearch("")
  }

  const defaultTrigger = (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7 rounded-sm outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring/70"
      title="Insert template"
    >
      <FileText className="h-4 w-4" />
    </Button>
  )

  return (
    <Popover open={isOpen} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        {trigger || defaultTrigger}
      </PopoverTrigger>
      <PopoverContent
        className="w-[320px] p-0"
        align="start"
        side="top"
      >
        {/* Search */}
        <div className="p-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search templates..."
              className="pl-10 h-9"
              autoFocus
            />
          </div>
        </div>

        {/* Template list */}
        <div className="max-h-[280px] overflow-y-auto">
          {templates.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              {search ? "No templates found" : "No templates available"}
            </div>
          ) : (
            <div className="p-1">
              {templates.map((template, index) => (
                <button
                  key={template.id}
                  onClick={() => handleSelect(template)}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-lg hover:bg-muted transition-colors",
                    selectedIndex === index && "bg-muted",
                  )}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-medium text-sm truncate">{template.title}</span>
                    {template.category && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-muted-foreground/10 text-muted-foreground shrink-0">
                        {template.category}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {template.content}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="p-2 border-t border-border text-xs text-muted-foreground text-center">
          Use arrow keys to navigate, Enter to select
        </div>
      </PopoverContent>
    </Popover>
  )
}
