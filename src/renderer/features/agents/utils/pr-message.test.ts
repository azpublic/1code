import { describe, it, expect } from "vitest"
import {
  generateMergeToMainMessage,
  generateCommitToPrMessage,
  generatePrMessage,
  generateReviewMessage,
  type PrContext,
} from "./pr-message"

describe("pr-message", () => {
  const mockContext: PrContext = {
    branch: "feature/test-branch",
    baseBranch: "main",
    uncommittedCount: 3,
    hasUpstream: true,
  }

  describe("generateMergeToMainMessage", () => {
    it("should generate message for merging uncommitted changes to main", () => {
      const result = generateMergeToMainMessage(mockContext)

      expect(result).toContain("3 uncommitted changes")
      expect(result).toContain("feature/test-branch")
      expect(result).toContain("main")
      expect(result).toContain("commit the uncommitted changes")
      expect(result).toContain("checkout the main branch")
      expect(result).toContain("Merge feature/test-branch into main")
      expect(result).toContain("Resolve conflicts")
      expect(result).toContain("worktree should remain on branch feature/test-branch")
    })

    it("should handle zero uncommitted changes", () => {
      const contextNoChanges: PrContext = {
        ...mockContext,
        uncommittedCount: 0,
      }

      const result = generateMergeToMainMessage(contextNoChanges)

      expect(result).toContain("All changes are already committed")
      expect(result).toContain("Use git to merge feature/test-branch into main")
    })

    it("should include conflict resolution instructions", () => {
      const result = generateMergeToMainMessage(mockContext)

      expect(result).toContain("merge conflicts:")
      expect(result).toContain("Analyze both sets of changes carefully")
      expect(result).toContain("Preserve the correct code from both branches")
      expect(result).toContain("Resolve conflicts by keeping the appropriate changes")
      expect(result).toContain("Consider the intent of both branches")
    })

    it("should instruct to keep worktree on its branch", () => {
      const result = generateMergeToMainMessage(mockContext)

      expect(result).toContain("worktree should remain on branch feature/test-branch")
      expect(result).toContain("Do not switch the worktree's branch")
      expect(result).toContain("only switch to main in the main repo")
    })

    it("should ask for user guidance on failure", () => {
      const result = generateMergeToMainMessage(mockContext)

      expect(result).toContain("If any of these steps fail or seem ambiguous, ask the user for guidance")
    })
  })

  describe("generateCommitToPrMessage", () => {
    it("should generate message for committing and pushing to PR", () => {
      const result = generateCommitToPrMessage(mockContext)

      expect(result).toContain("3 uncommitted changes")
      expect(result).toContain("feature/test-branch")
      expect(result).toContain("origin/main")
      expect(result).toContain("PR already exists")
      expect(result).toContain("Run git diff")
      expect(result).toContain("Commit them")
      expect(result).toContain("Push to origin")
    })

    it("should handle zero uncommitted changes", () => {
      const contextNoChanges: PrContext = {
        ...mockContext,
        uncommittedCount: 0,
      }

      const result = generateCommitToPrMessage(contextNoChanges)

      expect(result).toContain("All changes are already committed")
      expect(result).toContain("feature/test-branch is up to date")
    })
  })

  describe("generatePrMessage", () => {
    it("should generate message for creating a new PR", () => {
      const result = generatePrMessage(mockContext)

      expect(result).toContain("3 uncommitted changes")
      expect(result).toContain("feature/test-branch")
      expect(result).toContain("origin/main")
      expect(result).toContain("branch is already pushed")
      expect(result).toContain("gh pr create")
    })

    it("should handle branch without upstream", () => {
      const contextNoUpstream: PrContext = {
        ...mockContext,
        hasUpstream: false,
      }

      const result = generatePrMessage(contextNoUpstream)

      expect(result).toContain("There is no upstream branch yet")
      expect(result).toContain("Push to origin")
    })
  })

  describe("generateReviewMessage", () => {
    it("should generate message for code review", () => {
      const result = generateReviewMessage(mockContext)

      expect(result).toContain("code review")
      expect(result).toContain("feature/test-branch")
      expect(result).toContain("origin/main")
      expect(result).toContain("Focus on logic and correctness")
      expect(result).toContain("Consider readability")
      expect(result).toContain("Evaluate performance")
      expect(result).toContain("Assess test coverage")
    })

    it("should include output format instructions", () => {
      const result = generateReviewMessage(mockContext)

      expect(result).toContain("brief summary")
      expect(result).toContain("table of issues found")
      expect(result).toContain("severity")
      expect(result).toContain("file:line")
      expect(result).toContain("suggestion")
    })
  })
})
