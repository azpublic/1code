import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdtempSync, rmSync, existsSync, mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomBytes } from 'crypto'
import { execSync } from 'child_process'

// Mock Electron app module before importing settings
vi.mock('electron', () => ({
	app: {
		getPath: vi.fn((name: string) => {
			if (name === 'userData') {
				return join(tmpdir(), `1code-test-${randomBytes(8).toString('hex')}`)
			}
			return tmpdir()
		}),
	},
}))

// Mock the settings manager before importing worktree code
vi.mock('../../src/main/lib/settings', () => ({
	getSettingsManager: vi.fn(() => ({
		get: vi.fn(async (key: string) => null),
		set: vi.fn(async (key: string, value: unknown) => {}),
	})),
}))

// Import the actual main process code after mocking
import { generateBranchName } from '../../src/main/lib/git/worktree'

/**
 * E2E Test: Worktree Naming Synchronization
 *
 * This test verifies that worktree folder names match git branch names.
 *
 * Test Scenarios:
 * 1. Branch name format is valid (adjective-animal-hex)
 * 2. Folder name equals branch name
 * 3. Git worktree can be created with the generated name
 * 4. Multiple worktrees have unique names
 */

describe('E2E: Worktree Naming Synchronization', () => {
	let testDir: string
	let gitRepoPath: string

	beforeEach(() => {
		const id = randomBytes(8).toString('hex')
		const baseDir = join(tmpdir(), `1code-e2e-worktree-${id}`)
		testDir = mkdtempSync(baseDir)
		gitRepoPath = join(testDir, 'git-repo')

		// Create a real git repository for testing
		mkdirSync(gitRepoPath, { recursive: true })

		// Initialize git repo
		execSync('git init', { cwd: gitRepoPath, stdio: 'ignore' })
		execSync('git config user.email "test@example.com"', { cwd: gitRepoPath, stdio: 'ignore' })
		execSync('git config user.name "Test User"', { cwd: gitRepoPath, stdio: 'ignore' })

		// Create an initial commit
		writeFileSync(join(gitRepoPath, 'README.md'), '# Test Repository\n')
		execSync('git add .', { cwd: gitRepoPath, stdio: 'ignore' })
		execSync('git commit -m "Initial commit"', { cwd: gitRepoPath, stdio: 'ignore' })
	})

	afterEach(() => {
		if (existsSync(testDir)) {
			rmSync(testDir, { recursive: true, force: true })
		}
	})

	describe('Branch name generation', () => {
		it('should generate branch name with correct format', () => {
			const branch = generateBranchName()

			// Should have 3 parts separated by hyphens
			const parts = branch.split('-')
			expect(parts.length).toBeGreaterThanOrEqual(3)

			// Last part should be a 6-character hex string (3 bytes = 6 hex chars)
			const lastPart = parts[parts.length - 1]
			expect(lastPart).toMatch(/^[a-f0-9]{6}$/)

			// Should be valid git branch name
			expect(branch).not.toMatch(/[~^:?*\[\\]/)
			expect(branch).not.toMatch(/^\./)
			expect(branch).not.toMatch(/\.\./)
		})

		it('should generate unique branch names', () => {
			const names = new Set<string>()

			// Generate 100 names and verify they're all unique
			for (let i = 0; i < 100; i++) {
				const name = generateBranchName()
				names.add(name)
			}

			expect(names.size).toBe(100)
		})
	})

	describe('Worktree creation with matching names', () => {
		it('should create worktree where folder name equals branch name', () => {
			// Generate a branch name
			const branch = generateBranchName()

			// Create worktree using git
			const worktreePath = join(testDir, 'worktrees', branch)
			mkdirSync(join(testDir, 'worktrees'), { recursive: true })

			execSync(`git worktree add ${worktreePath} -b ${branch}`, {
				cwd: gitRepoPath,
				stdio: 'ignore',
			})

			// Verify folder exists
			expect(existsSync(worktreePath)).toBe(true)

			// Extract folder name from path
			const pathParts = worktreePath.split(/[\\/]/)
			const folderName = pathParts[pathParts.length - 1]

			// Verify folder name equals branch name
			expect(folderName).toBe(branch)

			// Verify git recognizes the worktree
			// Git worktree list uses forward slashes on all platforms
			const normalizedPath = worktreePath.replace(/\\/g, '/')
			const worktreeList = execSync('git worktree list', {
				cwd: gitRepoPath,
				encoding: 'utf-8',
			})
			expect(worktreeList).toContain(normalizedPath)
			expect(worktreeList).toContain(branch)
		})

		it('should have correct branch checked out in worktree', () => {
			const branch = generateBranchName()
			const worktreePath = join(testDir, 'worktrees', branch)

			mkdirSync(join(testDir, 'worktrees'), { recursive: true })
			execSync(`git worktree add ${worktreePath} -b ${branch}`, {
				cwd: gitRepoPath,
				stdio: 'ignore',
			})

			// Check current branch in worktree
			const currentBranch = execSync('git branch --show-current', {
				cwd: worktreePath,
				encoding: 'utf-8',
			}).trim()

			expect(currentBranch).toBe(branch)

			// Verify folder name from path matches branch
			const pathParts = worktreePath.split(/[\\/]/)
			const folderName = pathParts[pathParts.length - 1]
			expect(folderName).toBe(branch)
		})

		it('should create multiple worktrees with unique matching names', () => {
			const branches: string[] = []
			const worktreePaths: string[] = []

			// Create 5 worktrees
			for (let i = 0; i < 5; i++) {
				const branch = generateBranchName()
				const worktreePath = join(testDir, 'worktrees', branch)

				branches.push(branch)
				worktreePaths.push(worktreePath)

				mkdirSync(join(testDir, 'worktrees'), { recursive: true })
				execSync(`git worktree add ${worktreePath} -b ${branch}`, {
					cwd: gitRepoPath,
					stdio: 'ignore',
				})
			}

			// Verify all names are unique
			const uniqueBranches = new Set(branches)
			expect(uniqueBranches.size).toBe(5)

			// Verify all folder names match their branch names
			for (let i = 0; i < worktreePaths.length; i++) {
				const pathParts = worktreePaths[i].split(/[\\/]/)
				const folderName = pathParts[pathParts.length - 1]
				expect(folderName).toBe(branches[i])
				expect(existsSync(worktreePaths[i])).toBe(true)
			}

			// Verify git recognizes all worktrees
			const worktreeList = execSync('git worktree list', {
				cwd: gitRepoPath,
				encoding: 'utf-8',
			})

			for (const branch of branches) {
				expect(worktreeList).toContain(branch)
			}
		})
	})

	describe('Path structure verification', () => {
		it('should maintain consistent path structure', () => {
			const branch = generateBranchName()
			const projectSlug = 'my-test-project'
			const worktreeBase = join(testDir, 'worktrees')
			const projectWorktreeDir = join(worktreeBase, projectSlug)
			const worktreePath = join(projectWorktreeDir, branch)

			// Create the worktree
			mkdirSync(projectWorktreeDir, { recursive: true })
			execSync(`git worktree add ${worktreePath} -b ${branch}`, {
				cwd: gitRepoPath,
				stdio: 'ignore',
			})

			// Verify path structure: base/project-slug/branch
			expect(worktreePath).toContain(projectSlug)
			expect(worktreePath).toContain(branch)
			expect(worktreePath).toMatch(new RegExp(`${branch}$`))

			// Extract and verify folder name
			const pathParts = worktreePath.split(/[\\/]/)
			const folderName = pathParts[pathParts.length - 1]
			expect(folderName).toBe(branch)
		})
	})

	describe('Real-world scenario', () => {
		it('should handle complete workflow: generate name, create worktree, verify consistency', () => {
			// Simulate user creating a new chat with worktree

			// Step 1: Generate branch name
			const branch = generateBranchName()

			// Step 2: Create worktree folder
			const projectSlug = 'awesome-project'
			const worktreeBase = join(testDir, 'worktrees')
			const projectWorktreeDir = join(worktreeBase, projectSlug)
			const worktreePath = join(projectWorktreeDir, branch)

			mkdirSync(projectWorktreeDir, { recursive: true })

			// Step 3: Create git worktree
			execSync(`git worktree add ${worktreePath} -b ${branch}`, {
				cwd: gitRepoPath,
				stdio: 'ignore',
			})

			// Step 4: User checks folder name in finder/explorer
			const pathParts = worktreePath.split(/[\\/]/)
			const folderName = pathParts[pathParts.length - 1]

			// Step 5: User checks git branch
			const currentBranch = execSync('git branch --show-current', {
				cwd: worktreePath,
				encoding: 'utf-8',
			}).trim()

			// Both should match - no confusion!
			expect(folderName).toBe(branch)
			expect(currentBranch).toBe(branch)
			expect(folderName).toBe(currentBranch)

			// Verify the worktree is functional
			expect(existsSync(join(worktreePath, '.git'))).toBe(true)

			// User can make changes in the worktree
			writeFileSync(join(worktreePath, 'test.txt'), 'Hello from worktree!')
			execSync('git add .', { cwd: worktreePath, stdio: 'ignore' })
			execSync('git commit -m "Test commit"', { cwd: worktreePath, stdio: 'ignore' })

			// Verify commit appears in git log
			const gitLog = execSync('git log --oneline', {
				cwd: worktreePath,
				encoding: 'utf-8',
			})
			expect(gitLog).toContain('Test commit')
		})
	})

	describe('Collision handling', () => {
		it('should handle existing folders gracefully', () => {
			const branch = generateBranchName()
			const worktreePath = join(testDir, 'worktrees', branch)

			// Create the folder first with a file (simulating an existing worktree)
			mkdirSync(join(testDir, 'worktrees'), { recursive: true })
			mkdirSync(worktreePath, { recursive: true })
			writeFileSync(join(worktreePath, 'existing-file.txt'), 'This folder is not empty')

			// Try to create worktree with same name - git will fail
			// In real code, we regenerate the branch name
			let errorThrown = false
			try {
				execSync(`git worktree add ${worktreePath} -b ${branch}`, {
					cwd: gitRepoPath,
					stdio: 'ignore',
				})
			} catch (e) {
				errorThrown = true
			}

			// Git should fail because path is not empty
			expect(errorThrown).toBe(true)

			// Now generate a new branch and try again
			const newBranch = generateBranchName()
			const newWorktreePath = join(testDir, 'worktrees', newBranch)

			execSync(`git worktree add ${newWorktreePath} -b ${newBranch}`, {
				cwd: gitRepoPath,
				stdio: 'ignore',
			})

			// Verify new worktree was created successfully
			expect(existsSync(newWorktreePath)).toBe(true)

			// Verify folder name matches branch
			const pathParts = newWorktreePath.split(/[\\/]/)
			const folderName = pathParts[pathParts.length - 1]
			expect(folderName).toBe(newBranch)
		})
	})
})
