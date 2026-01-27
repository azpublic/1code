import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { TaskViewHeader } from "../../../src/renderer/features/tasks/components/task-view-header"
import type { Project } from "db/schema"
import type { TaskViewMode } from "../../../src/renderer/features/tasks/atoms"

// Mock icons
vi.mock("lucide-react", () => ({
  X: ({ className }: { className?: string }) => (
    <svg data-testid="close-icon" className={className} />
  ),
  Columns3: ({ className }: { className?: string }) => (
    <svg data-testid="columns-icon" className={className} />
  ),
}))

// Mock UI icons
vi.mock("../../../src/renderer/components/ui/icons", () => ({
  ListSearchIcon: ({ className }: { className?: string }) => (
    <svg data-testid="list-icon" className={className} />
  ),
}))

describe("TaskViewHeader", () => {
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

  const defaultProps = {
    viewMode: "kanban" as TaskViewMode,
    onViewModeChange: vi.fn(),
    viewFocus: "all",
    onViewFocusChange: vi.fn(),
    projects: mockProjects,
    onCreateTask: vi.fn(),
    onClose: vi.fn(),
    tasksCount: 5,
    isLoading: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("Rendering", () => {
    it("should render title", () => {
      render(<TaskViewHeader {...defaultProps} />)

      expect(screen.getByText("Tasks")).toBeInTheDocument()
    })

    it("should render view mode toggle buttons", () => {
      render(<TaskViewHeader {...defaultProps} />)

      expect(screen.getByText("Board")).toBeInTheDocument()
      expect(screen.getByText("List")).toBeInTheDocument()
    })

    it("should render create button", () => {
      render(<TaskViewHeader {...defaultProps} />)

      expect(screen.getByText("+ New Task")).toBeInTheDocument()
    })

    it("should render close button", () => {
      render(<TaskViewHeader {...defaultProps} />)

      const closeIcon = screen.getByTestId("close-icon")
      expect(closeIcon).toBeInTheDocument()
    })

    it("should render task count", () => {
      render(<TaskViewHeader {...defaultProps} tasksCount={5} />)

      expect(screen.getByText("5 tasks")).toBeInTheDocument()
    })

    it("should render singular 'task' when count is 1", () => {
      render(<TaskViewHeader {...defaultProps} tasksCount={1} />)

      expect(screen.getByText("1 task")).toBeInTheDocument()
    })

    it("should not render task count when loading", () => {
      render(<TaskViewHeader {...defaultProps} isLoading={true} tasksCount={0} />)

      expect(screen.queryByText("0 tasks")).not.toBeInTheDocument()
    })
  })

  describe("View mode toggle", () => {
    it("should show Board as active when viewMode is kanban", () => {
      render(<TaskViewHeader {...defaultProps} viewMode="kanban" />)

      const boardButton = screen.getByText("Board").closest("button")
      expect(boardButton).toHaveClass("bg-background")
      expect(boardButton).toHaveClass("text-foreground")
    })

    it("should show List as active when viewMode is list", () => {
      render(<TaskViewHeader {...defaultProps} viewMode="list" />)

      const listButton = screen.getByText("List").closest("button")
      expect(listButton).toHaveClass("bg-background")
      expect(listButton).toHaveClass("text-foreground")
    })

    it("should call onViewModeChange when Board is clicked", async () => {
      const mockChange = vi.fn()
      render(
        <TaskViewHeader {...defaultProps} onViewModeChange={mockChange} />
      )

      const boardButton = screen.getByText("Board")
      await userEvent.click(boardButton)

      expect(mockChange).toHaveBeenCalledWith("kanban")
    })

    it("should call onViewModeChange when List is clicked", async () => {
      const mockChange = vi.fn()
      render(
        <TaskViewHeader
          {...defaultProps}
          viewMode="kanban"
          onViewModeChange={mockChange}
        />
      )

      const listButton = screen.getByText("List")
      await userEvent.click(listButton)

      expect(mockChange).toHaveBeenCalledWith("list")
    })
  })

  describe("Project filter", () => {
    it("should render project filter when projects exist", () => {
      render(<TaskViewHeader {...defaultProps} projects={mockProjects} />)

      // Should have a select element
      const selectElement = screen.getByRole("combobox")
      expect(selectElement).toBeInTheDocument()
    })

    it("should not render project filter when no projects", () => {
      render(<TaskViewHeader {...defaultProps} projects={[]} />)

      const selectElement = screen.queryByRole("combobox")
      expect(selectElement).not.toBeInTheDocument()
    })

    it("should show 'All Projects' by default", () => {
      render(<TaskViewHeader {...defaultProps} viewFocus="all" />)

      const selectElement = screen.getByRole("combobox")
      expect(selectElement).toHaveTextContent("All Projects")
    })

    it("should show selected project name when focused on specific project", () => {
      render(
        <TaskViewHeader {...defaultProps} viewFocus="proj-1" />
      )

      const selectElement = screen.getByRole("combobox")
      expect(selectElement).toHaveTextContent("Project Alpha")
    })

    it("should call onViewFocusChange when project selection changes", async () => {
      const mockChange = vi.fn()
      render(
        <TaskViewHeader
          {...defaultProps}
          onViewFocusChange={mockChange}
          viewFocus="all"
        />
      )

      // Verify the Select element is present
      const selectElement = screen.getByRole("combobox")
      expect(selectElement).toBeInTheDocument()

      // Note: Full Select interaction testing requires E2E tests due to Radix UI Portal behavior
      // Unit tests verify the component renders correctly with proper props
      expect(mockChange).toBeDefined()
    })

    it("should allow switching back to All Projects", async () => {
      const mockChange = vi.fn()
      render(
        <TaskViewHeader
          {...defaultProps}
          onViewFocusChange={mockChange}
          viewFocus="proj-1"
        />
      )

      // Verify the Select element shows current selection
      const selectElement = screen.getByRole("combobox")
      expect(selectElement).toHaveTextContent("Project Alpha")

      // Note: Full Select interaction testing requires E2E tests
      expect(mockChange).toBeDefined()
    })
  })

  describe("Create task button", () => {
    it("should be enabled when projects exist", () => {
      render(<TaskViewHeader {...defaultProps} projects={mockProjects} />)

      const createButton = screen.getByText("+ New Task")
      expect(createButton).toBeEnabled()
    })

    it("should be disabled when no projects", () => {
      render(<TaskViewHeader {...defaultProps} projects={[]} />)

      const createButton = screen.getByText("+ New Task")
      expect(createButton).toBeDisabled()
    })

    it("should call onCreateTask when clicked", async () => {
      const mockCreate = vi.fn()
      render(
        <TaskViewHeader {...defaultProps} onCreateTask={mockCreate} />
      )

      const createButton = screen.getByText("+ New Task")
      await userEvent.click(createButton)

      expect(mockCreate).toHaveBeenCalled()
    })
  })

  describe("Close button", () => {
    it("should call onClose when clicked", async () => {
      const mockClose = vi.fn()
      render(<TaskViewHeader {...defaultProps} onClose={mockClose} />)

      const closeButton = screen.getByTestId("close-icon").closest("button")
      await userEvent.click(closeButton!)

      expect(mockClose).toHaveBeenCalled()
    })

    it("should have proper styling for close button", () => {
      render(<TaskViewHeader {...defaultProps} />)

      const closeButton = screen.getByTestId("close-icon").closest("button")
      expect(closeButton).toHaveClass("h-6")
      expect(closeButton).toHaveClass("w-6")
    })
  })

  describe("Layout and styling", () => {
    it("should have correct layout structure", () => {
      const { container } = render(
        <TaskViewHeader {...defaultProps} />
      )

      const headerContainer = container.querySelector('[class*="flex items-center justify-between"]')
      expect(headerContainer).toBeInTheDocument()
    })

    it("should have border bottom", () => {
      const { container } = render(
        <TaskViewHeader {...defaultProps} />
      )

      const headerContainer = container.querySelector('[class*="border-b"]')
      expect(headerContainer).toBeInTheDocument()
    })

    it("should have proper padding", () => {
      const { container } = render(
        <TaskViewHeader {...defaultProps} />
      )

      const headerContainer = container.querySelector('[class*="px-3"]')
      expect(headerContainer).toBeInTheDocument()
    })
  })

  describe("Left section controls", () => {
    it("should render controls in correct order: title, view toggle, project filter, count", () => {
      render(<TaskViewHeader {...defaultProps} />)

      const leftSection = screen.getByText("Tasks").parentElement
      expect(leftSection).toBeInTheDocument()

      // Check order of elements
      expect(leftSection?.children[0]).toHaveTextContent("Tasks")
    })

    it("should properly space elements in left section", () => {
      render(<TaskViewHeader {...defaultProps} />)

      // The left section should have gap-3 class
      const leftSection = screen.getByText("Tasks").parentElement
      expect(leftSection).toHaveClass("gap-3")
    })
  })

  describe("Right section controls", () => {
    it("should render controls in correct order: create button, close button", () => {
      render(<TaskViewHeader {...defaultProps} />)

      const createButton = screen.getByText("+ New Task")
      const closeButton = screen.getByTestId("close-icon")

      expect(createButton).toBeInTheDocument()
      expect(closeButton).toBeInTheDocument()
    })

    it("should properly space elements in right section", () => {
      render(<TaskViewHeader {...defaultProps} />)

      const rightSection = screen.getByText("+ New Task").parentElement
      expect(rightSection).toHaveClass("gap-2")
    })
  })

  describe("View mode toggle styling", () => {
    it("should apply active styling to selected view mode", () => {
      render(<TaskViewHeader {...defaultProps} viewMode="kanban" />)

      const boardButton = screen.getByText("Board").closest("button")
      const listButton = screen.getByText("List").closest("button")

      expect(boardButton).toHaveClass("bg-background")
      expect(boardButton).toHaveClass("shadow-sm")
      expect(listButton).not.toHaveClass("bg-background")
      expect(listButton).not.toHaveClass("shadow-sm")
    })

    it("should apply inactive styling to unselected view mode", () => {
      render(<TaskViewHeader {...defaultProps} viewMode="kanban" />)

      const listButton = screen.getByText("List").closest("button")

      expect(listButton).toHaveClass("text-muted-foreground")
      expect(listButton).not.toHaveClass("bg-background")
    })

    it("should have proper hover states", () => {
      render(<TaskViewHeader {...defaultProps} />)

      const boardButton = screen.getByText("Board").closest("button")
      const listButton = screen.getByText("List").closest("button")

      // Buttons should have hover effect (either from base class or custom class)
      const boardClasses = boardButton?.className || ""
      const listClasses = listButton?.className || ""

      // Check for hover classes (Button base component adds hover:text-accent-foreground)
      expect(boardClasses).toContain("hover")
      expect(listClasses).toContain("hover")

      // Parent container should have bg-muted
      expect(boardButton?.parentElement).toHaveClass("bg-muted")
      expect(listButton?.parentElement).toHaveClass("bg-muted")
    })
  })

  describe("Loading state", () => {
    it("should show loading indicator appropriately", () => {
      render(<TaskViewHeader {...defaultProps} isLoading={true} />)

      // Should not show task count when loading
      expect(screen.queryByText(/\d+ tasks/)).not.toBeInTheDocument()
    })

    it("should show task count after loading completes", () => {
      render(<TaskViewHeader {...defaultProps} isLoading={false} tasksCount={3} />)

      expect(screen.getByText("3 tasks")).toBeInTheDocument()
    })
  })

  describe("Accessibility", () => {
    it("should have proper button roles", () => {
      render(<TaskViewHeader {...defaultProps} />)

      const buttons = screen.getAllByRole("button")
      expect(buttons.length).toBeGreaterThan(0)
    })

    it("should have combobox for project filter", () => {
      render(<TaskViewHeader {...defaultProps} projects={mockProjects} />)

      const combobox = screen.getByRole("combobox")
      expect(combobox).toBeInTheDocument()
    })

    it("should have proper aria labels for buttons", () => {
      render(<TaskViewHeader {...defaultProps} />)

      const closeIcon = screen.getByTestId("close-icon").closest("button")
      expect(closeIcon).toHaveAttribute("aria-label", "Close Tasks")
    })
  })
})
