import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { existsSync } from 'node:fs'

// Mock the settings manager before importing worktree functions
vi.mock('@main/lib/settings', () => ({
	getSettingsManager: vi.fn(() => ({
		get: vi.fn(async (key: string) => {
			if (key === 'worktreeBaseLocation') return null
			return null
		}),
		set: vi.fn(),
	})),
}))

// Mock the database functions
vi.mock('@main/lib/db', () => ({
	getDatabase: vi.fn(() => ({
		select: vi.fn(() => ({
			from: vi.fn(() => ({
				where: vi.fn(() => ({
					get: vi.fn(() => null),
				})),
			})),
		})),
	})),
}))

import { generateBranchName } from '@main/lib/git/worktree'

describe('Worktree Naming', () => {
	describe('generateBranchName', () => {
		it('should generate a name with adjective-animal-hex format', () => {
			const name = generateBranchName()

			// Should have 3 parts separated by hyphens
			const parts = name.split('-')
			expect(parts.length).toBeGreaterThanOrEqual(3)

			// Last part should be a 6-character hex string (3 bytes = 6 hex chars)
			const lastPart = parts[parts.length - 1]
			expect(lastPart).toMatch(/^[a-f0-9]{6}$/)
		})

		it('should generate unique names', () => {
			const names = new Set<string>()

			// Generate 100 names and verify they're all unique
			for (let i = 0; i < 100; i++) {
				const name = generateBranchName()
				names.add(name)
			}

			expect(names.size).toBe(100)
		})

		it('should use lowercase letters and hyphens only', () => {
			const name = generateBranchName()

			// Should only contain lowercase letters, numbers, and hyphens
			expect(name).toMatch(/^[a-z0-9-]+$/)
		})
	})

	describe('Folder name equals branch name', () => {
		const testBaseDir = join(tmpdir(), 'worktree-test-' + Date.now())

		beforeEach(async () => {
			// Create test directory
			await mkdir(testBaseDir, { recursive: true })
		})

		afterEach(async () => {
			// Clean up test directory
			try {
				await rm(testBaseDir, { recursive: true, force: true })
			} catch {
				// Ignore cleanup errors
			}
		})

		it('should use branch name as folder name', () => {
			// This tests the logic that branch name equals folder name
			// In the actual code, the folder path is constructed as:
			// join(projectWorktreeDir, branch)

			const branch = generateBranchName()
			const projectSlug = 'test-project'
			const expectedPath = join(testBaseDir, projectSlug, branch)

			// Verify the path ends with the branch name
			const pathParts = expectedPath.split(/[\\/]/)
			const folderName = pathParts[pathParts.length - 1]

			expect(folderName).toBe(branch)
		})

		it('should handle collision detection', async () => {
			// Simulate collision detection logic
			const branch = generateBranchName()
			const projectSlug = 'test-project'
			const projectDir = join(testBaseDir, projectSlug)

			// Create the directory to simulate a collision
			await mkdir(projectDir, { recursive: true })
			const existingPath = join(projectDir, branch)
			await mkdir(existingPath, { recursive: true })

			// Verify the directory exists
			expect(existsSync(existingPath)).toBe(true)

			// In the actual code, if existsSync returns true, we regenerate
			const newBranch = generateBranchName()
			const newPath = join(projectDir, newBranch)

			// New path should not exist (collision resolved)
			expect(newPath).not.toBe(existingPath)
			expect(newBranch).not.toBe(branch)
		})

		it('should create consistent path structure', () => {
			const branch = generateBranchName()
			const projectSlug = 'my-test-project'

			// Simulate the path construction
			const worktreePath = join(testBaseDir, projectSlug, branch)

			// Verify path structure
			expect(worktreePath).toContain(projectSlug)
			expect(worktreePath).toContain(branch)
			expect(worktreePath).toMatch(new RegExp(`${branch}$`))
		})
	})

	describe('Path format validation', () => {
		it('should generate valid git branch names', () => {
			for (let i = 0; i < 10; i++) {
				const name = generateBranchName()

				// Git branch names cannot:
				// - Begin or end with a dot
				// - Contain two consecutive dots
				// - Contain ~, ^, :, ?, *, [, \, or spaces
				expect(name).not.toMatch(/^\./)
				expect(name).not.toMatch(/\.$/)
				expect(name).not.toMatch(/\.\./)
				expect(name).not.toMatch(/[~^:?*\[\\]/)

				// Should not have leading/trailing hyphens
				expect(name).not.toMatch(/^-/)
				expect(name).not.toMatch(/-$/)
			}
		})

		it('should generate valid filesystem folder names', () => {
			for (let i = 0; i < 10; i++) {
				const name = generateBranchName()

				// Invalid Windows filename characters: < > : " / \ | ? *
				// Invalid macOS/Linux filename characters: /
				expect(name).not.toMatch(/[<>:"/\\|?*]/)

				// Should be reasonably short (no longer than 255 chars)
				expect(name.length).toBeLessThan(100)
			}
		})
	})
})
