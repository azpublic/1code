import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Provider, createStore } from "jotai"
import { ChatTitleEditor } from "./chat-title-editor"
import { justCreatedIdsAtom } from "../atoms"

// Mock TypewriterText to avoid animation complexity in tests
vi.mock("../../../components/ui/typewriter-text", () => ({
  TypewriterText: ({ text, placeholder, showPlaceholder }: { text: string; placeholder?: string; showPlaceholder?: boolean }) => {
    if (!text && showPlaceholder) {
      return <span className="text-muted-foreground/50">{placeholder}</span>
    }
    return <span>{text || placeholder}</span>
  },
}))

// Mock trpc to prevent Electron connection attempts
vi.mock("../../../lib/trpc", () => ({
  trpc: {
    useQuery: () => ({ data: null, isLoading: false }),
    useMutation: () => ({ mutate: vi.fn(), isLoading: false }),
  },
  trpcClient: {},
}))

describe("ChatTitleEditor", () => {
  const mockOnSave = vi.fn(async (name: string) => {
    // Simulate async save
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Create a Jotai store with the justCreatedIdsAtom pre-initialized
  const createStoreWithEmptySet = () => {
    const store = createStore()
    store.set(justCreatedIdsAtom, new Set<string>())
    return store
  }

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={createStoreWithEmptySet()}>{children}</Provider>
  )

  describe("Basic rendering", () => {
    it("should render with just chat name (no project/branch)", () => {
      render(
        <ChatTitleEditor
          name="My Chat"
          placeholder="New Chat"
          onSave={mockOnSave}
          chatId="chat-1"
          hasMessages={true}
        />,
        { wrapper }
      )

      expect(screen.getByText("My Chat")).toBeInTheDocument()
    })

    it("should render with project name and chat name", () => {
      render(
        <ChatTitleEditor
          name="My Chat"
          projectName="My Project"
          placeholder="New Chat"
          onSave={mockOnSave}
          chatId="chat-1"
          hasMessages={true}
        />,
        { wrapper }
      )

      expect(screen.getByText("My Project")).toBeInTheDocument()
      expect(screen.getByText("My Chat")).toBeInTheDocument()
      // Check for separator
      const container = screen.getByText("My Project").parentElement
      expect(container?.textContent).toContain("•")
    })

    it("should render with project, chat name, and branch", () => {
      render(
        <ChatTitleEditor
          name="My Chat"
          projectName="My Project"
          branch="feature/awesome-feature"
          placeholder="New Chat"
          onSave={mockOnSave}
          chatId="chat-1"
          hasMessages={true}
        />,
        { wrapper }
      )

      expect(screen.getByText("My Project")).toBeInTheDocument()
      expect(screen.getByText("My Chat")).toBeInTheDocument()
      expect(screen.getByText("feature/awesome-feature")).toBeInTheDocument()
    })

    it("should render with project but no branch", () => {
      render(
        <ChatTitleEditor
          name="My Chat"
          projectName="My Project"
          branch={undefined}
          placeholder="New Chat"
          onSave={mockOnSave}
          chatId="chat-1"
          hasMessages={true}
        />,
        { wrapper }
      )

      expect(screen.getByText("My Project")).toBeInTheDocument()
      expect(screen.getByText("My Chat")).toBeInTheDocument()
      expect(screen.queryByText("feature/awesome-feature")).not.toBeInTheDocument()
    })

    it("should render placeholder when name is empty", () => {
      render(
        <ChatTitleEditor
          name=""
          placeholder="New Chat"
          onSave={mockOnSave}
          chatId="chat-1"
          hasMessages={true}
        />,
        { wrapper }
      )

      expect(screen.getByText("New Chat")).toBeInTheDocument()
    })
  })

  describe("Styling and layout", () => {
    it("should apply text-muted-foreground class to branch", () => {
      render(
        <ChatTitleEditor
          name="My Chat"
          projectName="My Project"
          branch="feature/test"
          placeholder="New Chat"
          onSave={mockOnSave}
          chatId="chat-1"
          hasMessages={true}
        />,
        { wrapper }
      )

      const branchElement = screen.getByText("feature/test")
      expect(branchElement).toHaveClass("text-muted-foreground")
    })

    it("should apply text-xs class to branch", () => {
      render(
        <ChatTitleEditor
          name="My Chat"
          projectName="My Project"
          branch="feature/test"
          placeholder="New Chat"
          onSave={mockOnSave}
          chatId="chat-1"
          hasMessages={true}
        />,
        { wrapper }
      )

      const branchElement = screen.getByText("feature/test")
      expect(branchElement).toHaveClass("text-xs")
    })
  })

  describe("Editing functionality", () => {
    it("should enter edit mode when clicking on title", async () => {
      render(
        <ChatTitleEditor
          name="My Chat"
          projectName="My Project"
          branch="feature/test"
          placeholder="New Chat"
          onSave={mockOnSave}
          chatId="chat-1"
          hasMessages={true}
        />,
        { wrapper }
      )

      const titleContainer = screen.getByText("My Chat").closest("div")
      await userEvent.click(titleContainer!)

      // Should show input field
      const input = screen.getByRole("textbox")
      expect(input).toBeInTheDocument()
      expect(input).toHaveValue("My Chat")
    })

    it("should not enter edit mode when disabled", async () => {
      render(
        <ChatTitleEditor
          name="My Chat"
          projectName="My Project"
          branch="feature/test"
          placeholder="New Chat"
          onSave={mockOnSave}
          disabled={true}
          chatId="chat-1"
          hasMessages={true}
        />,
        { wrapper }
      )

      const titleContainer = screen.getByText("My Chat").closest("div")
      await userEvent.click(titleContainer!)

      // Should NOT show input field
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument()
    })

    it("should save on Enter key", async () => {
      render(
        <ChatTitleEditor
          name="My Chat"
          projectName="My Project"
          branch="feature/test"
          placeholder="New Chat"
          onSave={mockOnSave}
          chatId="chat-1"
          hasMessages={true}
        />,
        { wrapper }
      )

      const titleContainer = screen.getByText("My Chat").closest("div")
      await userEvent.click(titleContainer!)

      const input = screen.getByRole("textbox")
      await userEvent.clear(input)
      await userEvent.type(input, "Updated Chat{Enter}")

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith("Updated Chat")
      })
    })

    it("should cancel on Escape key", async () => {
      render(
        <ChatTitleEditor
          name="My Chat"
          projectName="My Project"
          branch="feature/test"
          placeholder="New Chat"
          onSave={mockOnSave}
          chatId="chat-1"
          hasMessages={true}
        />,
        { wrapper }
      )

      const titleContainer = screen.getByText("My Chat").closest("div")
      await userEvent.click(titleContainer!)

      const input = screen.getByRole("textbox")
      await userEvent.clear(input)
      await userEvent.type(input, "Updated Chat{Escape}")

      await waitFor(() => {
        expect(mockOnSave).not.toHaveBeenCalled()
      })

      // Should show original name again
      expect(screen.getByText("My Chat")).toBeInTheDocument()
    })

    it("should not save when value is empty", async () => {
      render(
        <ChatTitleEditor
          name="My Chat"
          projectName="My Project"
          branch="feature/test"
          placeholder="New Chat"
          onSave={mockOnSave}
          chatId="chat-1"
          hasMessages={true}
        />,
        { wrapper }
      )

      const titleContainer = screen.getByText("My Chat").closest("div")
      await userEvent.click(titleContainer!)

      const input = screen.getByRole("textbox")
      await userEvent.clear(input)
      await userEvent.type(input, "{Enter}")

      await waitFor(() => {
        expect(mockOnSave).not.toHaveBeenCalled()
      })
    })
  })

  describe("Edge cases", () => {
    it("should handle very long project names with truncation", () => {
      const longProjectName = "This is a very long project name that should be truncated"
      render(
        <ChatTitleEditor
          name="My Chat"
          projectName={longProjectName}
          placeholder="New Chat"
          onSave={mockOnSave}
          chatId="chat-1"
          hasMessages={true}
        />,
        { wrapper }
      )

      const projectElement = screen.getByText(longProjectName)
      expect(projectElement).toBeInTheDocument()
      // The outer span should have truncate class
      const outerSpan = projectElement.parentElement
      expect(outerSpan).toHaveClass("truncate")
    })

    it("should handle very long branch names with truncation", () => {
      const longBranchName = "feature/this-is-a-very-long-branch-name-that-should-be-truncated"
      render(
        <ChatTitleEditor
          name="My Chat"
          projectName="My Project"
          branch={longBranchName}
          placeholder="New Chat"
          onSave={mockOnSave}
          chatId="chat-1"
          hasMessages={true}
        />,
        { wrapper }
      )

      const branchElement = screen.getByText(longBranchName)
      expect(branchElement).toBeInTheDocument()
      expect(branchElement).toHaveClass("truncate")
    })

    it("should not allow editing when name is placeholder", async () => {
      render(
        <ChatTitleEditor
          name="New Chat"
          placeholder="New Chat"
          onSave={mockOnSave}
          chatId="chat-1"
          hasMessages={false}
        />,
        { wrapper }
      )

      const titleContainer = screen.getByText("New Chat").closest("div")
      await userEvent.click(titleContainer!)

      // Should NOT enter edit mode since it's a placeholder
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument()
    })
  })
})
