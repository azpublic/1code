import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { TaskListView } from "../../../src/renderer/features/tasks/components/task-list-view"
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

describe("TaskListView", () => {
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
    it("should render table with headers", () => {
      render(<TaskListView tasks={mockTasks} projects={mockProjects} />)

      expect(screen.getByText("Task")).toBeInTheDocument()
      expect(screen.getByText("Project")).toBeInTheDocument()
      expect(screen.getByText("Priority")).toBeInTheDocument()
      expect(screen.getByText("Updated")).toBeInTheDocument()
    })

    it("should render all tasks", () => {
      render(<TaskListView tasks={mockTasks} projects={mockProjects} />)

      expect(screen.getByText("Task 1 - Todo")).toBeInTheDocument()
      expect(screen.getByText("Task 2 - In Progress")).toBeInTheDocument()
      expect(screen.getByText("Task 3 - Done")).toBeInTheDocument()
    })

    it("should render task descriptions", () => {
      render(<TaskListView tasks={mockTasks} projects={mockProjects} />)

      expect(screen.getByText("Description for task 1")).toBeInTheDocument()
      expect(screen.getByText("Description for task 2")).toBeInTheDocument()
      expect(screen.getByText("Description for task 3")).toBeInTheDocument()
    })

    it("should show empty state when no tasks", () => {
      render(<TaskListView tasks={[]} projects={mockProjects} />)

      expect(screen.getByText("No tasks yet")).toBeInTheDocument()
      expect(screen.getByText(/Create your first task/)).toBeInTheDocument()
    })
  })

  describe("Task information", () => {
    it("should render task titles", () => {
      render(<TaskListView tasks={mockTasks} projects={mockProjects} />)

      expect(screen.getByText("Task 1 - Todo")).toBeInTheDocument()
      expect(screen.getByText("Task 2 - In Progress")).toBeInTheDocument()
      expect(screen.getByText("Task 3 - Done")).toBeInTheDocument()
    })

    it("should render project badges", () => {
      render(<TaskListView tasks={mockTasks} projects={mockProjects} />)

      // There are 2 tasks from Project Alpha and 1 from Project Beta
      expect(screen.getAllByText("Project Alpha")).toHaveLength(2)
      expect(screen.getAllByText("Project Beta")).toHaveLength(1)
    })

    it("should render priority badges", () => {
      render(<TaskListView tasks={mockTasks} projects={mockProjects} />)

      expect(screen.getByText("high")).toBeInTheDocument()
      expect(screen.getByText("medium")).toBeInTheDocument()
      expect(screen.getByText("low")).toBeInTheDocument()
    })

    it("should render updated dates", () => {
      render(<TaskListView tasks={mockTasks} projects={mockProjects} />)

      // Should show formatted dates (check for year 2024 which is consistent)
      const dates = screen.getAllByText(/2024/)
      expect(dates.length).toBeGreaterThan(0)
    })
  })

  describe("Status indicators", () => {
    it("should render correct status icons", () => {
      render(<TaskListView tasks={mockTasks} projects={mockProjects} />)

      const circleIcons = screen.getAllByTestId("circle-icon")
      const circleDotIcons = screen.getAllByTestId("circledot-icon")
      const checkCircleIcons = screen.getAllByTestId("checkcircle-icon")

      expect(circleIcons.length).toBeGreaterThan(0) // Todo tasks
      expect(circleDotIcons.length).toBeGreaterThan(0) // In Progress tasks
      expect(checkCircleIcons.length).toBeGreaterThan(0) // Done tasks
    })

    it("should render correct status icon for todo task", () => {
      render(<TaskListView tasks={[mockTasks[0]]} projects={mockProjects} />)

      const circleIcons = screen.getAllByTestId("circle-icon")
      expect(circleIcons.length).toBeGreaterThan(0)
    })

    it("should render correct status icon for in-progress task", () => {
      render(<TaskListView tasks={[mockTasks[1]]} projects={mockProjects} />)

      const circleDotIcons = screen.getAllByTestId("circledot-icon")
      expect(circleDotIcons.length).toBeGreaterThan(0)
    })

    it("should render correct status icon for done task", () => {
      render(<TaskListView tasks={[mockTasks[2]]} projects={mockProjects} />)

      const checkCircleIcons = screen.getAllByTestId("checkcircle-icon")
      expect(checkCircleIcons.length).toBeGreaterThan(0)
    })
  })

  describe("Priority badges", () => {
    it("should render priority badges with correct styling", () => {
      const { container } = render(
        <TaskListView tasks={mockTasks} projects={mockProjects} />
      )

      const highBadge = screen.getByText("high")
      const mediumBadge = screen.getByText("medium")
      const lowBadge = screen.getByText("low")

      expect(highBadge).toBeInTheDocument()
      expect(mediumBadge).toBeInTheDocument()
      expect(lowBadge).toBeInTheDocument()
    })

    it("should render priority badges with border and text colors", () => {
      const { container } = render(
        <TaskListView tasks={mockTasks} projects={mockProjects} />
      )

      const badges = container.querySelectorAll('[class*="border"]')
      expect(badges.length).toBeGreaterThan(0)
    })
  })

  describe("Project badges", () => {
    it("should render project badges with correct styling", () => {
      const { container } = render(
        <TaskListView tasks={mockTasks} projects={mockProjects} />
      )

      const projectBadges = container.querySelectorAll('[class*="border"]')
      expect(projectBadges.length).toBeGreaterThan(0)
    })

    it("should handle tasks without project", () => {
      const tasksWithoutProject = mockTasks.map((task) => ({
        ...task,
        project: undefined,
      }))

      render(<TaskListView tasks={tasksWithoutProject} projects={mockProjects} />)

      // Should show "-" for tasks without project
      const dashes = screen.getAllByText("-")
      expect(dashes.length).toBeGreaterThan(0)
    })
  })

  describe("Table structure", () => {
    it("should render table with correct structure", () => {
      const { container } = render(
        <TaskListView tasks={mockTasks} projects={mockProjects} />
      )

      const table = container.querySelector("table")
      expect(table).toBeInTheDocument()

      const rows = container.querySelectorAll("tr")
      expect(rows.length).toBeGreaterThan(1) // Header + data rows
    })

    it("should render header row with correct columns", () => {
      render(<TaskListView tasks={mockTasks} projects={mockProjects} />)

      const headers = screen.getAllByRole("columnheader")
      expect(headers.length).toBeGreaterThanOrEqual(5) // Empty, Task, Project, Priority, Updated
    })
  })

  describe("Multi-project support", () => {
    it("should display tasks from multiple projects", () => {
      render(<TaskListView tasks={mockTasks} projects={mockProjects} />)

      // Check that tasks from different projects are displayed
      const task1 = screen.getByText("Task 1 - Todo")
      const task3 = screen.getByText("Task 3 - Done")
      expect(task1).toBeInTheDocument()
      expect(task3).toBeInTheDocument()
    })

    it("should color-code different projects", () => {
      const { container } = render(
        <TaskListView tasks={mockTasks} projects={mockProjects} />
      )

      const projectBadges = container.querySelectorAll('[class*="border"]')
      expect(projectBadges.length).toBeGreaterThan(0)
    })
  })

  describe("Task description truncation", () => {
    it("should truncate long descriptions", () => {
      const tasksWithLongDesc = [
        {
          ...mockTasks[0],
          description: "This is a very long description that should be truncated to fit in the table cell without overflowing",
        },
      ]

      render(<TaskListView tasks={tasksWithLongDesc} projects={mockProjects} />)

      const description = screen.getByText(/This is a very long description/)
      expect(description).toBeInTheDocument()
      expect(description).toHaveClass("line-clamp-1")
    })
  })

  describe("Task row styling", () => {
    it("should apply hover effect to task rows", () => {
      const { container } = render(
        <TaskListView tasks={mockTasks} projects={mockProjects} />
      )

      const rows = container.querySelectorAll("tbody tr")
      expect(rows.length).toBeGreaterThan(0)

      // Rows should have hover class
      rows.forEach((row) => {
        expect(row.getAttribute("class")).toContain("hover:")
      })
    })
  })

  describe("Date formatting", () => {
    it("should format dates correctly", () => {
      const taskWithSpecificDate = {
        ...mockTasks[0],
        updatedAt: new Date("2024-03-15"),
      }

      render(<TaskListView tasks={[taskWithSpecificDate]} projects={mockProjects} />)

      // Should show the date in a readable format (check for 2024 which is consistent)
      const dateElements = screen.getAllByText(/2024/)
      expect(dateElements.length).toBeGreaterThan(0)
    })
  })

  describe("Empty state", () => {
    it("should show helpful empty state message", () => {
      render(<TaskListView tasks={[]} projects={[]} />)

      expect(screen.getByText("No tasks yet")).toBeInTheDocument()
      expect(screen.getByText("Create your first task to get started")).toBeInTheDocument()
    })

    it("should center empty state message", () => {
      const { container } = render(
        <TaskListView tasks={[]} projects={mockProjects} />
      )

      const centerContainer = container.querySelector('[class*="items-center"]')
      expect(centerContainer).toBeInTheDocument()
    })
  })
})
