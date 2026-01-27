import { atom } from "jotai"
import { atomWithStorage } from "jotai/utils"

// Task status type
export type TaskStatus = "todo" | "in-progress" | "done"

// Task priority type
export type TaskPriority = "low" | "medium" | "high"

// Task sidebar open state - persisted per window
export const tasksSidebarOpenAtom = atomWithStorage<boolean>(
  "tasks-sidebar-open",
  false,
  undefined,
  { getOnInit: true },
)

// Task sidebar width (global, persisted)
export const tasksSidebarWidthAtom = atomWithStorage<number>(
  "tasks-sidebar-width",
  320,
  undefined,
  { getOnInit: true },
)

// Selected task ID - for editing/viewing details
export const selectedTaskIdAtom = atom<string | null>(null)

// Task status filter - show all or filter by status
export type TaskFilter = TaskStatus | "all"
export const taskFilterAtom = atomWithStorage<TaskFilter>(
  "tasks-filter",
  "all",
  undefined,
  { getOnInit: true },
)

// Task form dialog open state
export const taskFormDialogOpenAtom = atom<boolean>(false)

// Task being edited (null = creating new task)
export const editingTaskAtom = atom<{
  id: string | null
  title: string
  description: string
  priority: TaskPriority
} | null>(null)

// Task sort order
export type TaskSortOrder = "updated-desc" | "updated-asc" | "priority-desc" | "priority-asc"
export const taskSortOrderAtom = atomWithStorage<TaskSortOrder>(
  "tasks-sort-order",
  "updated-desc",
  undefined,
  { getOnInit: true },
)
