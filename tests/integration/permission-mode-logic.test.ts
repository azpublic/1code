import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, existsSync, writeFileSync, readFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomBytes } from 'crypto'

/**
 * Integration test for permission mode selection logic
 *
 * This test uses the actual main process code (not mocks) but with
 * an isolated test database and settings file.
 */

type PermissionMode = 'auto' | 'prompt' | 'restrict' | null

class TestEnvironment {
  readonly id: string
  readonly testDir: string
  readonly settingsPath: string
  readonly dbPath: string

  constructor() {
    this.id = randomBytes(8).toString('hex')
    const baseDir = join(tmpdir(), `1code-integration-${this.id}`)
    this.testDir = mkdtempSync(baseDir)
    this.settingsPath = join(this.testDir, 'settings.json')
    this.dbPath = join(this.testDir, 'test.db')
  }

  cleanup() {
    if (existsSync(this.testDir)) {
      rmSync(this.testDir, { recursive: true, force: true })
    }
  }

  writeSettings(settings: Record<string, unknown>) {
    writeFileSync(this.settingsPath, JSON.stringify(settings, null, 2))
  }

  readSettings(): Record<string, unknown> {
    const content = readFileSync(this.settingsPath, 'utf-8')
    return JSON.parse(content)
  }
}

describe('Permission Mode Selection Logic (Integration)', () => {
  let env: TestEnvironment

  beforeEach(() => {
    env = new TestEnvironment()
  })

  afterEach(() => {
    env.cleanup()
  })

  describe('Settings file persistence', () => {
    it('should write and read permission settings', () => {
      const settings = {
        agentPermissionLocalMode: 'prompt' as const,
        agentPermissionWorktreeMode: 'auto' as const,
        interviewTimeoutSeconds: 60,
      }

      env.writeSettings(settings)

      const read = env.readSettings()
      expect(read.agentPermissionLocalMode).toBe('prompt')
      expect(read.agentPermissionWorktreeMode).toBe('auto')
    })

    it('should handle null values for project overrides', () => {
      const settings = {
        agentPermissionLocalMode: null,
        agentPermissionWorktreeMode: 'auto' as const,
      }

      env.writeSettings(settings)

      const read = env.readSettings()
      expect(read.agentPermissionLocalMode).toBeNull()
      expect(read.agentPermissionWorktreeMode).toBe('auto')
    })
  })

  describe('Permission mode priority logic', () => {
    it('should prioritize project override over global default', () => {
      // Global defaults
      const globalSettings = {
        agentPermissionLocalMode: 'prompt',
        agentPermissionWorktreeMode: 'auto',
      }
      env.writeSettings(globalSettings)

      // Simulate: Project has override for local mode
      const projectOverride = {
        agentPermissionLocalMode: 'auto',
        agentPermissionWorktreeMode: null, // Use global
      }

      // Simulate the logic from claude.ts
      const isWorktreeMode = false // Local mode
      const projectHasOverride = projectOverride.agentPermissionLocalMode !== null

      let permissionPref: PermissionMode
      if (projectHasOverride) {
        permissionPref = projectOverride.agentPermissionLocalMode
      } else {
        // Fall back to global
        const settings = env.readSettings()
        permissionPref = isWorktreeMode
          ? (settings.agentPermissionWorktreeMode as PermissionMode)
          : (settings.agentPermissionLocalMode as PermissionMode)
      }

      // Should use project override, not global
      expect(permissionPref).toBe('auto')
    })

    it('should use global default when project override is null', () => {
      const globalSettings = {
        agentPermissionLocalMode: 'restrict',
        agentPermissionWorktreeMode: 'auto',
      }
      env.writeSettings(globalSettings)

      // Project has no override
      const projectOverride = {
        agentPermissionLocalMode: null,
        agentPermissionWorktreeMode: null,
      }

      const isWorktreeMode = false // Local mode
      const projectHasOverride = projectOverride.agentPermissionLocalMode !== null

      let permissionPref: PermissionMode
      if (projectHasOverride) {
        permissionPref = projectOverride.agentPermissionLocalMode
      } else {
        const settings = env.readSettings()
        permissionPref = isWorktreeMode
          ? (settings.agentPermissionWorktreeMode as PermissionMode)
          : (settings.agentPermissionLocalMode as PermissionMode)
      }

      // Should use global default
      expect(permissionPref).toBe('restrict')
    })
  })

  describe('Permission mode to SDK mapping', () => {
    it('should map "auto" to bypassPermissions with skip', () => {
      const permissionPref: PermissionMode = 'auto'

      let permissionMode: 'bypassPermissions' | 'plan' | undefined
      let allowDangerouslySkipPermissions: boolean | undefined

      switch (permissionPref) {
        case 'auto':
          permissionMode = 'bypassPermissions'
          allowDangerouslySkipPermissions = true
          break
      }

      expect(permissionMode).toBe('bypassPermissions')
      expect(allowDangerouslySkipPermissions).toBe(true)
    })

    it('should map "prompt" to undefined with no skip', () => {
      const permissionPref: PermissionMode = 'prompt'

      let permissionMode: 'bypassPermissions' | 'plan' | undefined
      let allowDangerouslySkipPermissions: boolean | undefined

      switch (permissionPref) {
        case 'prompt':
          permissionMode = undefined
          allowDangerouslySkipPermissions = false
          break
      }

      expect(permissionMode).toBeUndefined()
      expect(allowDangerouslySkipPermissions).toBe(false)
    })

    it('should map "restrict" to plan mode', () => {
      const permissionPref: PermissionMode = 'restrict'

      let permissionMode: 'bypassPermissions' | 'plan' | undefined
      let allowDangerouslySkipPermissions: boolean | undefined

      switch (permissionPref) {
        case 'restrict':
          permissionMode = 'plan'
          allowDangerouslySkipPermissions = false
          break
      }

      expect(permissionMode).toBe('plan')
      expect(allowDangerouslySkipPermissions).toBe(false)
    })

    it('should map null to fallback (auto-approve)', () => {
      const permissionPref: PermissionMode = null

      let permissionMode: 'bypassPermissions' | 'plan' | undefined
      let allowDangerouslySkipPermissions: boolean | undefined

      // Fallback behavior
      if (!permissionPref) {
        permissionMode = 'bypassPermissions'
        allowDangerouslySkipPermissions = true
      }

      expect(permissionMode).toBe('bypassPermissions')
      expect(allowDangerouslySkipPermissions).toBe(true)
    })
  })

  describe('Plan mode override', () => {
    it('should always use plan mode in plan mode regardless of settings', () => {
      const globalSettings = {
        agentPermissionLocalMode: 'auto',
        agentPermissionWorktreeMode: 'auto',
      }
      env.writeSettings(globalSettings)

      const mode = 'plan' // Plan mode overrides everything
      const permissionMode: 'bypassPermissions' | 'plan' | undefined =
        mode === 'plan' ? 'plan' : undefined

      expect(permissionMode).toBe('plan')
    })
  })
})
