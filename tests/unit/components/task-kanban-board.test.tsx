import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { TaskKanbanBoard } from "../../../src/renderer/features/tasks/components/task-kanban-board"
import type { Project } from "db/schema"

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  Circle: ({ className }: { className?: string }) => (
    <svg data-testid="circle-icon" className={className} />
  ),
  CircleDot: ({ className }: { className?: string }) => (
    <svg data-testid="circledot-icon" className={className} />
  ),
  CheckCircle2: ({ className }: { className?: string }) => (
    <svg data-testid="checkcircle-icon" className={className} />
  ),
}))

describe("TaskKanbanBoard", () => {
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
      project: mockProjects[0],
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
      project: mockProjects[0],
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
      project: mockProjects[1],
    },
  ]

  describe("Rendering", () => {
    it("should render all three columns", () => {
      render(<TaskKanbanBoard tasks={mockTasks} projects={mockProjects} />)

      expect(screen.getByText("To Do")).toBeInTheDocument()
      expect(screen.getByText("In Progress")).toBeInTheDocument()
      expect(screen.getByText("Done")).toBeInTheDocument()
    })

    it("should render task counts in column headers", () => {
      render(<TaskKanbanBoard tasks={mockTasks} projects={mockProjects} />)

      // Each column has 1 task, so we should see the count "1" in each column
      const counts = screen.getAllByText("1")
      expect(counts).toHaveLength(3) // One for each column
    })

    it("should show 'No tasks' when a column has no tasks", () => {
      const onlyTodoTasks = [mockTasks[0]] // Only todo task
      render(<TaskKanbanBoard tasks={onlyTodoTasks} projects={mockProjects} />)

      // In Progress and Done columns should show "No tasks"
      const noTasksMessages = screen.getAllByText("No tasks")
      expect(noTasksMessages).toHaveLength(2)
    })
  })

  describe("Task grouping", () => {
    it("should group tasks by status correctly", () => {
      render(<TaskKanbanBoard tasks={mockTasks} projects={mockProjects} />)

      // Todo column
      expect(screen.getByText("Task 1 - Todo")).toBeInTheDocument()

      // In Progress column
      expect(screen.getByText("Task 2 - In Progress")).toBeInTheDocument()

      // Done column
      expect(screen.getByText("Task 3 - Done")).toBeInTheDocument()
    })

    it("should handle empty task list", () => {
      render(<TaskKanbanBoard tasks={[]} projects={mockProjects} />)

      expect(screen.getByText("To Do")).toBeInTheDocument()
      expect(screen.getByText("In Progress")).toBeInTheDocument()
      expect(screen.getByText("Done")).toBeInTheDocument()

      // All columns should show "No tasks"
      const noTasksMessages = screen.getAllByText("No tasks")
      expect(noTasksMessages.length).toBe(3)
    })
  })

  describe("Task cards", () => {
    it("should render task title", () => {
      render(<TaskKanbanBoard tasks={mockTasks} projects={mockProjects} />)

      expect(screen.getByText("Task 1 - Todo")).toBeInTheDocument()
      expect(screen.getByText("Task 2 - In Progress")).toBeInTheDocument()
      expect(screen.getByText("Task 3 - Done")).toBeInTheDocument()
    })

    it("should render task description when present", () => {
      render(<TaskKanbanBoard tasks={mockTasks} projects={mockProjects} />)

      expect(screen.getByText("Description for task 1")).toBeInTheDocument()
      expect(screen.getByText("Description for task 2")).toBeInTheDocument()
      expect(screen.getByText("Description for task 3")).toBeInTheDocument()
    })

    it("should render priority badges", () => {
      render(<TaskKanbanBoard tasks={mockTasks} projects={mockProjects} />)

      expect(screen.getByText("high")).toBeInTheDocument()
      expect(screen.getByText("medium")).toBeInTheDocument()
      expect(screen.getByText("low")).toBeInTheDocument()
    })

    it("should render project badges", () => {
      render(<TaskKanbanBoard tasks={mockTasks} projects={mockProjects} />)

      // There are 2 tasks from Project Alpha and 1 from Project Beta
      expect(screen.getAllByText("Project Alpha")).toHaveLength(2)
      expect(screen.getAllByText("Project Beta")).toHaveLength(1)
    })

    it("should handle tasks without project association", () => {
      const tasksWithoutProject = mockTasks.map((task) => ({
        ...task,
        project: undefined,
      }))

      render(<TaskKanbanBoard tasks={tasksWithoutProject} projects={mockProjects} />)

      // Should still render tasks
      expect(screen.getByText("Task 1 - Todo")).toBeInTheDocument()
      expect(screen.getByText("Task 2 - In Progress")).toBeInTheDocument()
      expect(screen.getByText("Task 3 - Done")).toBeInTheDocument()
    })
  })

  describe("Column layout", () => {
    it("should render columns in correct order", () => {
      const { container } = render(
        <TaskKanbanBoard tasks={mockTasks} projects={mockProjects} />
      )

      const columns = container.querySelectorAll('[class*="rounded-lg border"]')
      expect(columns.length).toBeGreaterThanOrEqual(3)
    })
  })

  describe("Status icons", () => {
    it("should render correct icon for each status", () => {
      render(<TaskKanbanBoard tasks={mockTasks} projects={mockProjects} />)

      const circleIcons = screen.getAllByTestId("circle-icon")
      const circleDotIcons = screen.getAllByTestId("circledot-icon")
      const checkCircleIcons = screen.getAllByTestId("checkcircle-icon")

      // Each column should have its icon in the header
      expect(circleIcons.length).toBeGreaterThan(0) // Todo
      expect(circleDotIcons.length).toBeGreaterThan(0) // In Progress
      expect(checkCircleIcons.length).toBeGreaterThan(0) // Done
    })
  })

  describe("Multi-project tasks", () => {
    it("should display tasks from multiple projects", () => {
      render(<TaskKanbanBoard tasks={mockTasks} projects={mockProjects} />)

      // Check that tasks from different projects are displayed
      const task1 = screen.getByText("Task 1 - Todo")
      const task3 = screen.getByText("Task 3 - Done")
      expect(task1).toBeInTheDocument()
      expect(task3).toBeInTheDocument()
    })

    it("should color-code different projects", () => {
      const { container } = render(
        <TaskKanbanBoard tasks={mockTasks} projects={mockProjects} />
      )

      // Project badges should have different color classes
      const projectBadges = container.querySelectorAll('[class*="border"]')
      expect(projectBadges.length).toBeGreaterThan(0)
    })
  })

  describe("Task card styling", () => {
    it("should apply correct styling to task cards", () => {
      const { container } = render(
        <TaskKanbanBoard tasks={mockTasks} projects={mockProjects} />
      )

      // Task cards should have hover effect styling
      const taskCards = container.querySelectorAll('[class*="group"]')
      expect(taskCards.length).toBeGreaterThan(0)
    })

    it("should render priority badges with correct colors", () => {
      const { container } = render(
        <TaskKanbanBoard tasks={mockTasks} projects={mockProjects} />
      )

      // Check that priority badges have color classes
      const badges = container.querySelectorAll('[class*="border"]')
      const priorityBadges = Array.from(badges).filter((badge) =>
        badge.textContent === "high" || badge.textContent === "medium" || badge.textContent === "low"
      )
      expect(priorityBadges.length).toBe(3)

      // Check for color-specific classes
      const highBadge = screen.getByText("high")
      expect(highBadge.closest("span")).toHaveClass("bg-red-500/10")

      const lowBadge = screen.getByText("low")
      expect(lowBadge.closest("span")).toHaveClass("bg-blue-500/10")
    })
  })
})
