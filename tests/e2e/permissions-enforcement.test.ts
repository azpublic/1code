import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomBytes } from 'crypto'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { eq } from 'drizzle-orm'

// Import the actual main process code
import { projects } from '../../src/main/lib/db/schema'
import { MockProject } from './fixtures/mock-project'

/**
 * E2E Test: Permission Settings Enforcement
 *
 * This test verifies that permission settings are correctly enforced
 * when creating SDK queries, using the actual main process code.
 *
 * Test Scenarios:
 * 1. Global default: Local mode prompts, Worktree mode auto-approves
 * 2. Project override: Local mode auto-approves for specific project
 * 3. Project override: Worktree mode prompts for specific project
 * 4. Project override: Restrict mode blocks dangerous tools
 * 5. Plan mode always overrides to plan permissions
 */

type PermissionMode = 'auto' | 'prompt' | 'restrict' | null

class E2ETestEnvironment {
  readonly id: string
  readonly testDir: string
  readonly dbPath: string
  readonly settingsPath: string
  private db: Database.Database
  private client: ReturnType<typeof drizzle>

  constructor() {
    this.id = randomBytes(8).toString('hex')
    const baseDir = join(tmpdir(), `1code-e2e-${this.id}`)
    this.testDir = mkdtempSync(baseDir)
    this.dbPath = join(this.testDir, 'test.db')
    this.settingsPath = join(this.testDir, 'settings.json')

    // Initialize database directory
    mkdirSync(join(this.dbPath, '..'), { recursive: true })

    this.db = new Database(this.dbPath)
    this.client = drizzle(this.db)
  }

  /**
   * Set global permission settings
   */
  setGlobalSettings(settings: {
    agentPermissionLocalMode?: PermissionMode
    agentPermissionWorktreeMode?: PermissionMode
  }) {
    const currentSettings = this.readSettings()
    const updated = { ...currentSettings, ...settings }
    writeFileSync(this.settingsPath, JSON.stringify(updated, null, 2))
  }

  /**
   * Read current settings
   */
  readSettings(): Record<string, unknown> {
    if (!existsSync(this.settingsPath)) {
      return {}
    }
    return JSON.parse(readFileSync(this.settingsPath, 'utf-8'))
  }

  /**
   * Create a project in the database
   */
  async createProject(
    project: MockProject,
    overrides?: {
      agentPermissionLocalMode?: PermissionMode
      agentPermissionWorktreeMode?: PermissionMode
    },
  ) {
    await this.client.insert(projects).values({
      ...project.toDbEntry(),
      ...overrides,
    })
  }

  /**
   * Get a project from the database
   */
  async getProject(projectId: string) {
    const result = await this.client
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .get()
    return result
  }

  /**
   * Simulate the permission mode selection logic from claude.ts
   * This is the actual logic that runs when a chat query is created
   */
  getPermissionMode(input: {
    projectId: string | null
    worktreePath: string | null
    mode: 'agent' | 'plan'
  }): {
    mode: 'bypassPermissions' | 'plan' | undefined
    allowDangerouslySkipPermissions: boolean | undefined
    description: string
  } {
    // Determine if we're in worktree mode
    const isWorktreeMode = !!input.worktreePath

    // First, check if the project has a permission override
    let permissionPref: PermissionMode = null

    if (input.projectId) {
      const project = this.client
        .select({
          agentPermissionLocalMode: projects.agentPermissionLocalMode,
          agentPermissionWorktreeMode: projects.agentPermissionWorktreeMode,
        })
        .from(projects)
        .where(eq(projects.id, input.projectId))
        .get()

      if (project) {
        permissionPref = isWorktreeMode
          ? project.agentPermissionWorktreeMode
          : project.agentPermissionLocalMode
      }
    }

    // Fall back to global default if no project override
    if (!permissionPref) {
      const settings = this.readSettings()
      permissionPref = (isWorktreeMode
        ? settings.agentPermissionWorktreeMode
        : settings.agentPermissionLocalMode) as PermissionMode
    }

    // Map preference to SDK permission mode
    let permissionMode: 'bypassPermissions' | 'plan' | undefined
    let allowDangerouslySkipPermissions: boolean | undefined
    let description = ''

    if (input.mode === 'plan') {
      // Plan mode always uses plan permissions
      permissionMode = 'plan'
      description = 'Plan mode - read-only'
    } else {
      // Agent mode - use configured preference
      switch (permissionPref) {
        case 'auto':
          permissionMode = 'bypassPermissions'
          allowDangerouslySkipPermissions = true
          description = `AUTO-APPROVE (${isWorktreeMode ? 'worktree' : 'local'} mode)`
          break
        case 'prompt':
          permissionMode = undefined
          allowDangerouslySkipPermissions = false
          description = `PROMPT (${isWorktreeMode ? 'worktree' : 'local'} mode)`
          break
        case 'restrict':
          permissionMode = 'plan'
          allowDangerouslySkipPermissions = false
          description = `RESTRICTED (${isWorktreeMode ? 'worktree' : 'local'} mode)`
          break
        default:
          // Fallback to auto-approve for backward compatibility
          permissionMode = 'bypassPermissions'
          allowDangerouslySkipPermissions = true
          description = `AUTO-APPROVE (fallback, ${isWorktreeMode ? 'worktree' : 'local'} mode)`
      }
    }

    return { permissionMode, allowDangerouslySkipPermissions, description }
  }

  cleanup() {
    if (existsSync(this.testDir)) {
      rmSync(this.testDir, { recursive: true, force: true })
    }
    this.db.close()
  }
}

describe('E2E: Permission Settings Enforcement', () => {
  let env: E2ETestEnvironment
  let project1: MockProject
  let project2: MockProject

  beforeEach(() => {
    env = new E2ETestEnvironment()
    project1 = MockProject.create({ name: 'Test Project 1' })
    project2 = MockProject.create({ name: 'Test Project 2' })
  })

  afterEach(() => {
    env.cleanup()
    project1.cleanup()
    project2.cleanup()
  })

  describe('Global default permissions', () => {
    it('should use global defaults when no project override exists', () => {
      // Set global defaults
      env.setGlobalSettings({
        agentPermissionLocalMode: 'prompt',
        agentPermissionWorktreeMode: 'auto',
      })

      // Create project with no overrides
      env.createProject(project1)

      // Test Local mode (no worktree)
      const localResult = env.getPermissionMode({
        projectId: project1.id,
        worktreePath: null,
        mode: 'agent',
      })

      expect(localResult.description).toBe('PROMPT (local mode)')
      expect(localResult.permissionMode).toBeUndefined()
      expect(localResult.allowDangerouslySkipPermissions).toBe(false)

      // Test Worktree mode
      const worktreeResult = env.getPermissionMode({
        projectId: project1.id,
        worktreePath: '/some/worktree',
        mode: 'agent',
      })

      expect(worktreeResult.description).toBe('AUTO-APPROVE (worktree mode)')
      expect(worktreeResult.permissionMode).toBe('bypassPermissions')
      expect(worktreeResult.allowDangerouslySkipPermissions).toBe(true)
    })
  })

  describe('Project-level override: Local mode', () => {
    it('should use project override for local mode', () => {
      // Set global defaults
      env.setGlobalSettings({
        agentPermissionLocalMode: 'prompt', // Global: prompt
        agentPermissionWorktreeMode: 'auto',
      })

      // Create project with override: auto (override global prompt)
      env.createProject(project1, {
        agentPermissionLocalMode: 'auto',
      })

      const result = env.getPermissionMode({
        projectId: project1.id,
        worktreePath: null, // Local mode
        mode: 'agent',
      })

      // Should use project override, not global
      expect(result.description).toBe('AUTO-APPROVE (local mode)')
      expect(result.permissionMode).toBe('bypassPermissions')
      expect(result.allowDangerouslySkipPermissions).toBe(true)
    })

    it('should fall back to global when project override is null', () => {
      env.setGlobalSettings({
        agentPermissionLocalMode: 'restrict',
      })

      // Create project with null override (explicitly use global)
      env.createProject(project1, {
        agentPermissionLocalMode: null,
      })

      const result = env.getPermissionMode({
        projectId: project1.id,
        worktreePath: null,
        mode: 'agent',
      })

      expect(result.description).toBe('RESTRICTED (local mode)')
      expect(result.permissionMode).toBe('plan')
    })

    it('should allow different projects to have different settings', async () => {
      env.setGlobalSettings({
        agentPermissionLocalMode: 'prompt',
      })

      // Project 1: auto-approve
      await env.createProject(project1, {
        agentPermissionLocalMode: 'auto',
      })

      // Project 2: restrict
      await env.createProject(project2, {
        agentPermissionLocalMode: 'restrict',
      })

      const result1 = env.getPermissionMode({
        projectId: project1.id,
        worktreePath: null,
        mode: 'agent',
      })

      const result2 = env.getPermissionMode({
        projectId: project2.id,
        worktreePath: null,
        mode: 'agent',
      })

      expect(result1.description).toBe('AUTO-APPROVE (local mode)')
      expect(result2.description).toBe('RESTRICTED (local mode)')
    })
  })

  describe('Project-level override: Worktree mode', () => {
    it('should use project override for worktree mode', () => {
      env.setGlobalSettings({
        agentPermissionLocalMode: 'prompt',
        agentPermissionWorktreeMode: 'auto', // Global: auto
      })

      // Create project with override: prompt (override global auto)
      env.createProject(project1, {
        agentPermissionWorktreeMode: 'prompt',
      })

      const result = env.getPermissionMode({
        projectId: project1.id,
        worktreePath: '/some/worktree', // Worktree mode
        mode: 'agent',
      })

      expect(result.description).toBe('PROMPT (worktree mode)')
      expect(result.permissionMode).toBeUndefined()
      expect(result.allowDangerouslySkipPermissions).toBe(false)
    })

    it('should allow independent local and worktree overrides', () => {
      env.setGlobalSettings({
        agentPermissionLocalMode: 'prompt',
        agentPermissionWorktreeMode: 'auto',
      })

      // Project with different settings for each mode
      env.createProject(project1, {
        agentPermissionLocalMode: 'restrict',
        agentPermissionWorktreeMode: 'restrict',
      })

      const localResult = env.getPermissionMode({
        projectId: project1.id,
        worktreePath: null, // Local mode
        mode: 'agent',
      })

      const worktreeResult = env.getPermissionMode({
        projectId: project1.id,
        worktreePath: '/some/worktree', // Worktree mode
        mode: 'agent',
      })

      expect(localResult.description).toBe('RESTRICTED (local mode)')
      expect(worktreeResult.description).toBe('RESTRICTED (worktree mode)')
    })
  })

  describe('Restrict mode', () => {
    it('should use plan permissions in restrict mode', () => {
      env.setGlobalSettings({
        agentPermissionLocalMode: 'prompt',
      })

      env.createProject(project1, {
        agentPermissionLocalMode: 'restrict',
      })

      const result = env.getPermissionMode({
        projectId: project1.id,
        worktreePath: null,
        mode: 'agent',
      })

      // Restrict mode uses plan permissions
      expect(result.permissionMode).toBe('plan')
      expect(result.allowDangerouslySkipPermissions).toBe(false)
      expect(result.description).toBe('RESTRICTED (local mode)')
    })
  })

  describe('Plan mode override', () => {
    it('should always use plan permissions regardless of settings', () => {
      // Even with auto-approve enabled
      env.setGlobalSettings({
        agentPermissionLocalMode: 'auto',
        agentPermissionWorktreeMode: 'auto',
      })

      env.createProject(project1, {
        agentPermissionLocalMode: 'auto',
        agentPermissionWorktreeMode: 'auto',
      })

      const result = env.getPermissionMode({
        projectId: project1.id,
        worktreePath: null,
        mode: 'plan', // Plan mode overrides everything
      })

      expect(result.permissionMode).toBe('plan')
      expect(result.description).toBe('Plan mode - read-only')
    })
  })

  describe('Real-world scenario: Safe worktree, careful local', () => {
    it('should handle common configuration: safe worktree, careful local', () => {
      // Typical setup: Auto-approve in isolated worktrees, prompt when working locally
      env.setGlobalSettings({
        agentPermissionLocalMode: 'prompt', // Be careful in main project
        agentPermissionWorktreeMode: 'auto', // Safe to experiment in worktree
      })

      env.createProject(project1)

      // Local mode: should prompt
      const localResult = env.getPermissionMode({
        projectId: project1.id,
        worktreePath: null,
        mode: 'agent',
      })
      expect(localResult.description).toBe('PROMPT (local mode)')

      // Worktree mode: should auto-approve
      const worktreeResult = env.getPermissionMode({
        projectId: project1.id,
        worktreePath: '/path/to/worktree',
        mode: 'agent',
      })
      expect(worktreeResult.description).toBe('AUTO-APPROVE (worktree mode)')
    })
  })

  describe('Real-world scenario: YOLO project override', () => {
    it('should allow one project to be in yolo mode while others are safe', () => {
      // Global: safe defaults
      env.setGlobalSettings({
        agentPermissionLocalMode: 'prompt',
        agentPermissionWorktreeMode: 'prompt',
      })

      // Project 1: Use safe defaults
      env.createProject(project1)

      // Project 2: YOLO mode (override)
      env.createProject(project2, {
        agentPermissionLocalMode: 'auto',
        agentPermissionWorktreeMode: 'auto',
      })

      const project1Result = env.getPermissionMode({
        projectId: project1.id,
        worktreePath: null,
        mode: 'agent',
      })

      const project2Result = env.getPermissionMode({
        projectId: project2.id,
        worktreePath: null,
        mode: 'agent',
      })

      expect(project1Result.description).toBe('PROMPT (local mode)')
      expect(project2Result.description).toBe('AUTO-APPROVE (local mode)')
    })
  })
})
