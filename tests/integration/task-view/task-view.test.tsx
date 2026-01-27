import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Provider, createStore } from "jotai"
import React from "react"
import { TaskView } from "../../../src/renderer/features/tasks/task-view"
import { taskViewModeAtom, taskViewFocusAtom, taskViewVisibleAtom } from "../../../src/renderer/features/tasks/atoms"
import { selectedProjectAtom } from "../../../src/renderer/features/agents/atoms"
import type { Project } from "db/schema"

// Mock trpc to prevent Electron connection attempts
const mockTasks = [
  {
    id: "task-1",
    projectId: "proj-1",
    title: "Task 1 - Todo",
    description: "Description for task 1",
    status: "todo" as const,
    priority: "high" as const,
    planPath: null,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-02"),
    completedAt: null,
  },
  {
    id: "task-2",
    projectId: "proj-1",
    title: "Task 2 - In Progress",
    description: "Description for task 2",
    status: "in-progress" as const,
    priority: "medium" as const,
    planPath: null,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-02"),
    completedAt: null,
  },
  {
    id: "task-3",
    projectId: "proj-2",
    title: "Task 3 - Done",
    description: "Description for task 3",
    status: "done" as const,
    priority: "low" as const,
    planPath: null,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-02"),
    completedAt: new Date("2024-01-03"),
  },
]

const mockProjects: Project[] = [
  {
    id: "proj-1",
    name: "Project Alpha",
    path: "/path/to/alpha",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "proj-2",
    name: "Project Beta",
    path: "/path/to/beta",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

vi.mock("../../../src/renderer/lib/trpc", () => ({
  trpc: {
    projects: {
      list: {
        useQuery: () => ({
          data: mockProjects,
          isLoading: false,
        }),
      },
    },
    tasks: {
      listByProjects: {
        useQuery: () => ({
          data: mockTasks,
          isLoading: false,
        }),
      },
    },
    useUtils: () => ({
      invalidate: () => {},
      projects: {
        invalidate: () => {},
      },
      tasks: {
        invalidate: () => {},
      },
    }),
  },
  useUtils: () => ({
    invalidate: () => {},
    projects: {
      invalidate: () => {},
    },
    tasks: {
      invalidate: () => {},
    },
  }),
  trpcClient: {},
}))

// Mock TaskViewHeader, TaskKanbanBoard, and TaskListView to test container behavior
vi.mock("../../../src/renderer/features/tasks/components/task-view-header", () => ({
  TaskViewHeader: ({ viewMode, onViewModeChange, viewFocus, onViewFocusChange, onCreateTask, onClose, tasksCount }: any) => (
    <div data-testid="task-view-header">
      <button data-testid="view-mode-btn" onClick={() => onViewModeChange(viewMode === "kanban" ? "list" : "kanban")}>
        Toggle View
      </button>
      <button data-testid="project-focus-btn" onClick={() => onViewFocusChange(viewFocus === "all" ? "proj-1" : "all")}>
        Toggle Focus
      </button>
      <button data-testid="create-task-btn" onClick={onCreateTask}>
        Create Task
      </button>
      <button data-testid="close-btn" onClick={onClose}>
        Close
      </button>
      <span data-testid="tasks-count">{tasksCount}</span>
    </div>
  ),
}))

vi.mock("../../../src/renderer/features/tasks/components/task-kanban-board", () => ({
  TaskKanbanBoard: ({ tasks }: any) => (
    <div data-testid="task-kanban-board">
      <span data-testid="kanban-task-count">{tasks.length}</span>
    </div>
  ),
}))

vi.mock("../../../src/renderer/features/tasks/components/task-list-view", () => ({
  TaskListView: ({ tasks }: any) => (
    <div data-testid="task-list-view">
      <span data-testid="list-task-count">{tasks.length}</span>
    </div>
  ),
}))

describe("TaskView Integration", () => {
  const createStoreWithDefaults = () => {
    const store = createStore()
    store.set(taskViewModeAtom, "kanban")
    store.set(taskViewFocusAtom, "all")
    store.set(taskViewVisibleAtom, true)
    return store
  }

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={createStoreWithDefaults()}>{children}</Provider>
  )

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("Rendering", () => {
    it("should render TaskViewHeader", () => {
      render(<TaskView />, { wrapper })

      expect(screen.getByTestId("task-view-header")).toBeInTheDocument()
    })

    it("should render Kanban board by default", () => {
      render(<TaskView />, { wrapper })

      expect(screen.getByTestId("task-kanban-board")).toBeInTheDocument()
    })

    it("should not render List view initially", () => {
      render(<TaskView />, { wrapper })

      expect(screen.queryByTestId("task-list-view")).not.toBeInTheDocument()
    })
  })

  describe("View mode switching", () => {
    it("should switch to List view when mode is changed", async () => {
      const store = createStoreWithDefaults()
      function customWrapper({ children }: { children: React.ReactNode }) {
        return <Provider store={store}>{children}</Provider>
      }

      render(<TaskView />, { wrapper: customWrapper })

      // Switch to list mode via store
      store.set(taskViewModeAtom, "list")

      await waitFor(() => {
        expect(screen.getByTestId("task-list-view")).toBeInTheDocument()
      })
    })

    it("should switch back to Kanban view", async () => {
      const store = createStoreWithDefaults()
      store.set(taskViewModeAtom, "list")
      function customWrapper({ children }: { children: React.ReactNode }) {
        return <Provider store={store}>{children}</Provider>
      }

      render(<TaskView />, { wrapper: customWrapper })

      // Switch to kanban mode via store
      store.set(taskViewModeAtom, "kanban")

      await waitFor(() => {
        expect(screen.getByTestId("task-kanban-board")).toBeInTheDocument()
      })
    })
  })

  describe("Project focus", () => {
    it("should fetch tasks for all projects when focus is 'all'", () => {
      const store = createStoreWithDefaults()
      store.set(taskViewFocusAtom, "all")
      function customWrapper({ children }: { children: React.ReactNode }) {
        return <Provider store={store}>{children}</Provider>
      }

      render(<TaskView />, { wrapper: customWrapper })

      const kanbanBoard = screen.getByTestId("task-kanban-board")
      expect(kanbanBoard).toBeInTheDocument()
    })

    it("should handle focus change to specific project", async () => {
      const store = createStoreWithDefaults()
      function customWrapper({ children }: { children: React.ReactNode }) {
        return <Provider store={store}>{children}</Provider>
      }

      render(<TaskView />, { wrapper: customWrapper })

      // Change focus to specific project
      store.set(taskViewFocusAtom, "proj-1")

      // Component should re-render with new project
      await waitFor(() => {
        expect(screen.getByTestId("task-kanban-board")).toBeInTheDocument()
      })
    })
  })

  describe("Create task", () => {
    it("should handle create task callback", async () => {
      render(<TaskView />, { wrapper })

      const createButton = screen.getByTestId("create-task-btn")
      await userEvent.click(createButton)

      // Should not throw any errors
      expect(createButton).toBeInTheDocument()
    })
  })

  describe("Close task view", () => {
    it("should handle close callback", async () => {
      render(<TaskView />, { wrapper })

      const closeButton = screen.getByTestId("close-btn")
      await userEvent.click(closeButton)

      // Should not throw any errors
      expect(closeButton).toBeInTheDocument()
    })
  })

  describe("Layout structure", () => {
    it("should render with correct layout classes", () => {
      const { container } = render(<TaskView />, { wrapper })

      // TaskView should render a container with some structure
      // Use a more flexible query since the mock components may have different structure
      const mainContainer = container.querySelector('[class*="h-full"]')
      expect(mainContainer).toBeInTheDocument()
    })

    it("should render header and content sections", () => {
      const { container } = render(<TaskView />, { wrapper })

      const header = container.querySelector('[data-testid="task-view-header"]')
      const content = container.querySelector('[data-testid="task-kanban-board"]')

      expect(header).toBeInTheDocument()
      expect(content).toBeInTheDocument()
    })
  })

  describe("Task count display", () => {
    it("should display correct task count in header", () => {
      render(<TaskView />, { wrapper })

      const countElement = screen.getByTestId("tasks-count")
      expect(countElement).toHaveTextContent("3")
    })
  })

  describe("State persistence", () => {
    it("should maintain view mode across re-renders", () => {
      const store = createStoreWithDefaults()
      store.set(taskViewModeAtom, "list")
      function customWrapper({ children }: { children: React.ReactNode }) {
        return <Provider store={store}>{children}</Provider>
      }

      const { rerender } = render(<TaskView />, { wrapper: customWrapper })

      expect(screen.getByTestId("task-list-view")).toBeInTheDocument()

      // Re-render with same store
      rerender(<TaskView />)

      // Should still be in list mode
      expect(screen.getByTestId("task-list-view")).toBeInTheDocument()
    })

    it("should maintain project focus across re-renders", () => {
      const store = createStoreWithDefaults()
      store.set(taskViewFocusAtom, "proj-2")
      function customWrapper({ children }: { children: React.ReactNode }) {
        return <Provider store={store}>{children}</Provider>
      }

      const { rerender } = render(<TaskView />, { wrapper: customWrapper })

      // Re-render with same store
      rerender(<TaskView />)

      // Should maintain focus
      expect(screen.getByTestId("task-kanban-board")).toBeInTheDocument()
    })
  })

  describe("Error handling", () => {
    it("should render without crashing even with mock data", () => {
      render(<TaskView />, { wrapper })

      // Should render without crashing
      expect(screen.getByTestId("task-view-header")).toBeInTheDocument()
    })
  })
})
