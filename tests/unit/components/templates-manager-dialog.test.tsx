import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { TemplatesManagerDialog } from "../../../src/renderer/features/agents/components/templates-manager-dialog"
import { trpc } from "../../../src/renderer/lib/trpc"

// Mock tRPC
vi.mock("../../../src/renderer/lib/trpc", () => ({
  trpc: {
    templates: {
      list: {
        useQuery: vi.fn(),
      },
      create: {
        useMutation: vi.fn(),
      },
      update: {
        useMutation: vi.fn(),
      },
      delete: {
        useMutation: vi.fn(),
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

// Mock motion
vi.mock("motion/react", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}))

describe("TemplatesManagerDialog", () => {
  const mockTemplates = [
    {
      id: "tpl-1",
      title: "Code Review",
      content: "Review this code...",
      category: "code",
      createdAt: new Date(),
      updatedAt: new Date(),
      usageCount: 5,
    },
  ]

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onInsertTemplate: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(trpc.templates.list.useQuery).mockReturnValue({
      data: mockTemplates,
      isLoading: false,
    } as unknown as ReturnType<typeof trpc.templates.list.useQuery>)

    // Mock mutations
    vi.mocked(trpc.templates.create.useMutation).mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof trpc.templates.create.useMutation>)
    vi.mocked(trpc.templates.update.useMutation).mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof trpc.templates.update.useMutation>)
    vi.mocked(trpc.templates.delete.useMutation).mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof trpc.templates.delete.useMutation>)

    // Mock window.confirm
    global.confirm = vi.fn(() => true)
  })

  describe("Rendering", () => {
    it("should render dialog title", () => {
      render(<TemplatesManagerDialog {...defaultProps} />)
      expect(screen.getByText("Prompt Templates")).toBeInTheDocument()
    })

    it("should render new template button", () => {
      render(<TemplatesManagerDialog {...defaultProps} />)
      expect(screen.getByText("New Template")).toBeInTheDocument()
    })

    it("should render search input", () => {
      render(<TemplatesManagerDialog {...defaultProps} />)
      expect(screen.getByPlaceholderText("Search templates...")).toBeInTheDocument()
    })

    it("should display templates in list", () => {
      render(<TemplatesManagerDialog {...defaultProps} />)
      expect(screen.getByText("Code Review")).toBeInTheDocument()
    })

    it("should show empty state when no templates", () => {
      vi.mocked(trpc.templates.list.useQuery).mockReturnValue({
        data: [],
        isLoading: false,
      } as unknown as ReturnType<typeof trpc.templates.list.useQuery>)

      render(<TemplatesManagerDialog {...defaultProps} />)
      expect(screen.getByText(/No templates yet/)).toBeInTheDocument()
    })

    it("should show usage count", () => {
      render(<TemplatesManagerDialog {...defaultProps} />)
      expect(screen.getByText(/Used 5 times/)).toBeInTheDocument()
    })
  })

  describe("Create template", () => {
    it("should show create form when New Template clicked", async () => {
      const mockCreate = vi.fn()
      vi.mocked(trpc.templates.create.useMutation).mockReturnValue({
        mutate: mockCreate,
        mutateAsync: mockCreate,
        isPending: false,
      } as unknown as ReturnType<typeof trpc.templates.create.useMutation>)

      render(<TemplatesManagerDialog {...defaultProps} />)

      const newButton = screen.getByText("New Template")
      await userEvent.click(newButton)

      expect(screen.getByPlaceholderText("Template title")).toBeInTheDocument()
      expect(screen.getByPlaceholderText("Template content")).toBeInTheDocument()
    })

    it("should call create mutation when form submitted", async () => {
      const mockCreate = vi.fn()
      vi.mocked(trpc.templates.create.useMutation).mockReturnValue({
        mutate: mockCreate,
        mutateAsync: mockCreate,
        isPending: false,
      } as unknown as ReturnType<typeof trpc.templates.create.useMutation>)

      render(<TemplatesManagerDialog {...defaultProps} />)

      await userEvent.click(screen.getByText("New Template"))

      await userEvent.type(screen.getByPlaceholderText("Template title"), "New Template")
      await userEvent.type(screen.getByPlaceholderText("Template content"), "New content")

      const createButton = screen.getByText("Create")
      await userEvent.click(createButton)

      expect(mockCreate).toHaveBeenCalledWith({
        title: "New Template",
        content: "New content",
        category: "",
      })
    })
  })

  describe("Insert template", () => {
    it("should call onInsertTemplate when insert clicked", async () => {
      const mockInsert = vi.fn()
      render(<TemplatesManagerDialog {...defaultProps} onInsertTemplate={mockInsert} />)

      const insertButton = screen.getAllByRole("button").find(
        btn => btn.getAttribute("title") === "Insert into chat"
      )
      if (insertButton) await userEvent.click(insertButton)

      expect(mockInsert).toHaveBeenCalledWith("tpl-1", "Review this code...")
    })
  })

  describe("Close dialog", () => {
    it("should call onClose when close button clicked", async () => {
      const mockClose = vi.fn()
      render(<TemplatesManagerDialog {...defaultProps} onClose={mockClose} />)

      // Wait for INTERACTION_DELAY_MS (250ms) to pass before dialog can be closed
      await new Promise(resolve => setTimeout(resolve, 300))

      const closeButton = screen.getByText("Close")
      await userEvent.click(closeButton)

      expect(mockClose).toHaveBeenCalled()
    })

    it("should call onClose when escape pressed", async () => {
      const mockClose = vi.fn()
      render(<TemplatesManagerDialog {...defaultProps} onClose={mockClose} />)

      // Wait for INTERACTION_DELAY_MS (250ms) to pass before dialog can be closed
      await new Promise(resolve => setTimeout(resolve, 300))

      await userEvent.keyboard("{Escape}")

      expect(mockClose).toHaveBeenCalled()
    })
  })

  describe("Search", () => {
    it("should filter templates by search term", async () => {
      render(<TemplatesManagerDialog {...defaultProps} />)

      const searchInput = screen.getByPlaceholderText("Search templates...")
      await userEvent.type(searchInput, "code")

      expect(screen.getByText("Code Review")).toBeInTheDocument()
    })
  })
})
