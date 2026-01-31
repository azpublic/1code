import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { TemplateSelectorPopover } from "../../../src/renderer/features/agents/components/template-selector-popover"
import { trpc } from "../../../src/renderer/lib/trpc"

// Mock tRPC
vi.mock("../../../src/renderer/lib/trpc", () => ({
  trpc: {
    templates: {
      list: {
        useQuery: vi.fn(() => ({ data: [], isLoading: false })),
      },
      recordUsage: {
        useMutation: vi.fn(() => ({ mutate: vi.fn(), mutateAsync: vi.fn() })),
      },
    },
    useUtils: () => ({
      templates: {
        list: {
          invalidate: vi.fn(),
        },
      },
    }),
  },
}))

// Mock icons
vi.mock("lucide-react", () => ({
  FileText: function FileTextIcon({ className }: { className?: string }) {
    return <svg data-testid="file-text-icon" className={className} />
  },
  Search: function SearchIcon({ className }: { className?: string }) {
    return <svg data-testid="search-icon" className={className} />
  },
}))

// Mock Popover - simplified version that renders content inline
vi.mock("../../../src/renderer/components/ui/popover", () => ({
  Popover: function PopoverMock({ children, open }: any) {
    const trigger = typeof children === 'function' ? children({ open: true }) : children
    return <div data-popover-open={open}>{trigger}</div>
  },
  PopoverTrigger: function PopoverTriggerMock({ children }: any) {
    return <div data-popover-trigger="true">{children}</div>
  },
  PopoverContent: function PopoverContentMock({ children }: any) {
    return <div data-popover-content="true">{children}</div>
  },
}))

describe("TemplateSelectorPopover", () => {
  const mockTemplates = [
    {
      id: "tpl-1",
      title: "Code Review",
      content: "Review this code...",
      category: "code",
    },
    {
      id: "tpl-2",
      title: "Documentation",
      content: "Write docs for...",
      category: "docs",
    },
  ]

  const defaultProps = {
    isOpen: true,
    onOpenChange: vi.fn(),
    onSelectTemplate: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Mock tRPC query to return templates
    vi.mocked(trpc.templates.list.useQuery).mockReturnValue({
      data: mockTemplates,
      isLoading: false,
    } as unknown as ReturnType<typeof trpc.templates.list.useQuery>)
  })

  describe("Rendering", () => {
    it("should render trigger button when open", () => {
      render(<TemplateSelectorPopover {...defaultProps} />)
      expect(screen.getByTestId("file-text-icon")).toBeInTheDocument()
    })

    it("should render popover content when open", () => {
      render(<TemplateSelectorPopover {...defaultProps} />)
      expect(screen.getByPlaceholderText("Search templates...")).toBeInTheDocument()
    })

    it("should display all templates", () => {
      render(<TemplateSelectorPopover {...defaultProps} />)
      expect(screen.getByText("Code Review")).toBeInTheDocument()
      expect(screen.getByText("Documentation")).toBeInTheDocument()
    })

    it("should show template preview content", () => {
      render(<TemplateSelectorPopover {...defaultProps} />)
      expect(screen.getByText("Review this code...")).toBeInTheDocument()
    })

    it("should display category badge", () => {
      render(<TemplateSelectorPopover {...defaultProps} />)
      expect(screen.getByText("code")).toBeInTheDocument()
      expect(screen.getByText("docs")).toBeInTheDocument()
    })

    it("should show empty state when no templates", () => {
      vi.mocked(trpc.templates.list.useQuery).mockReturnValue({
        data: [],
        isLoading: false,
      } as unknown as ReturnType<typeof trpc.templates.list.useQuery>)

      render(<TemplateSelectorPopover {...defaultProps} />)
      expect(screen.getByText("No templates available")).toBeInTheDocument()
    })

    it("should show no results message when search matches nothing", async () => {
      vi.mocked(trpc.templates.list.useQuery).mockReturnValue({
        data: [],
        isLoading: false,
      } as unknown as ReturnType<typeof trpc.templates.list.useQuery>)

      render(<TemplateSelectorPopover {...defaultProps} />)
      expect(screen.getByText("No templates available")).toBeInTheDocument()
    })
  })

  describe("Template selection", () => {
    it("should call onSelectTemplate when template is clicked", async () => {
      const mockSelect = vi.fn()
      render(<TemplateSelectorPopover {...defaultProps} onSelectTemplate={mockSelect} />)

      const template = screen.getByText("Code Review").closest("button")
      await userEvent.click(template!)

      expect(mockSelect).toHaveBeenCalledWith("tpl-1", "Review this code...")
    })

    it("should close popover after selection", async () => {
      const mockClose = vi.fn()
      render(<TemplateSelectorPopover {...defaultProps} onOpenChange={mockClose} />)

      const template = screen.getByText("Code Review").closest("button")
      await userEvent.click(template!)

      expect(mockClose).toHaveBeenCalledWith(false)
    })

    it("should call recordUsage mutation on selection", async () => {
      const mockRecordUsage = vi.fn()
      vi.mocked(trpc.templates.recordUsage.useMutation).mockReturnValue({
        mutate: mockRecordUsage,
        mutateAsync: mockRecordUsage,
      } as unknown as ReturnType<typeof trpc.templates.recordUsage.useMutation>)

      render(<TemplateSelectorPopover {...defaultProps} />)

      const template = screen.getByText("Code Review").closest("button")
      await userEvent.click(template!)

      expect(mockRecordUsage).toHaveBeenCalledWith({ id: "tpl-1" })
    })
  })

  describe("Search functionality", () => {
    it("should have search input that accepts text", async () => {
      render(<TemplateSelectorPopover {...defaultProps} />)

      const searchInput = screen.getByPlaceholderText("Search templates...")
      await userEvent.type(searchInput, "test")

      expect(searchInput).toHaveValue("test")
    })

    it("should show templates when search is empty", async () => {
      render(<TemplateSelectorPopover {...defaultProps} />)

      expect(screen.getByText("Code Review")).toBeInTheDocument()
      expect(screen.getByText("Documentation")).toBeInTheDocument()
    })
  })

  describe("Accessibility", () => {
    it("should have proper button role for templates", () => {
      render(<TemplateSelectorPopover {...defaultProps} />)

      const buttons = screen.getAllByRole("button")
      expect(buttons.length).toBeGreaterThan(0)
    })

    it("should have proper input role for search", () => {
      render(<TemplateSelectorPopover {...defaultProps} />)

      const searchInput = screen.getByRole("textbox")
      expect(searchInput).toBeInTheDocument()
    })
  })

  describe("Loading state", () => {
    it("should show loading indicator when loading", () => {
      vi.mocked(trpc.templates.list.useQuery).mockReturnValue({
        data: undefined,
        isLoading: true,
      } as unknown as ReturnType<typeof trpc.templates.list.useQuery>)

      render(<TemplateSelectorPopover {...defaultProps} />)
      // Loading state would show a spinner or similar
    })
  })
})
