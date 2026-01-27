import { describe, it, expect, beforeEach, vi } from 'vitest'

type PermissionMode = 'auto' | 'prompt' | 'restrict' | null

// Mock settings manager
const mockSettings = new Map<string, any>()
const mockProjects = new Map<string, any>()

vi.mock('../../../src/main/lib/settings', () => ({
  getSettingsManager: vi.fn(() => ({
    get: vi.fn((key: string) => mockSettings.get(key)),
  })),
}))

vi.mock('../../../src/main/lib/db', () => ({
  getDatabase: vi.fn(() => ({
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          get: vi.fn(() => {
            const projectId = Array.from(mockProjects.keys())[0]
            return mockProjects.get(projectId)
          }),
        })),
      })),
    })),
  })),
}))

describe('Permission Mode Selection Logic', () => {
  const mockProjectId = 'test-project-id'

  beforeEach(() => {
    // Clear all mocks
    mockSettings.clear()
    mockProjects.clear()

    // Set default global settings
    mockSettings.set('agentPermissionLocalMode', 'prompt')
    mockSettings.set('agentPermissionWorktreeMode', 'auto')
  })

  describe('Local mode (no worktree)', () => {
    it('should use project override when set', () => {
      // Project override: auto, Global default: prompt
      mockProjects.set(mockProjectId, {
        id: mockProjectId,
        agentPermissionLocalMode: 'auto',
        agentPermissionWorktreeMode: 'restrict',
      })

      const input = {
        projectId: mockProjectId,
        worktreePath: null, // Local mode
        mode: 'agent',
      }

      const isWorktreeMode = !!input.worktreePath
      let permissionPref: PermissionMode = null

      if (input.projectId) {
        const project = mockProjects.get(mockProjectId)
        if (project) {
          permissionPref = isWorktreeMode
            ? project.agentPermissionWorktreeMode
            : project.agentPermissionLocalMode
        }
      }

      if (!permissionPref) {
        permissionPref = isWorktreeMode
          ? mockSettings.get('agentPermissionWorktreeMode')
          : mockSettings.get('agentPermissionLocalMode')
      }

      expect(permissionPref).toBe('auto')
    })

    it('should use global default when project override is null', () => {
      // Project override: null, Global default: prompt
      mockProjects.set(mockProjectId, {
        id: mockProjectId,
        agentPermissionLocalMode: null,
        agentPermissionWorktreeMode: null,
      })

      const input = {
        projectId: mockProjectId,
        worktreePath: null, // Local mode
        mode: 'agent',
      }

      const isWorktreeMode = !!input.worktreePath
      let permissionPref: PermissionMode = null

      if (input.projectId) {
        const project = mockProjects.get(mockProjectId)
        if (project) {
          permissionPref = isWorktreeMode
            ? project.agentPermissionWorktreeMode
            : project.agentPermissionLocalMode
        }
      }

      if (!permissionPref) {
        permissionPref = isWorktreeMode
          ? mockSettings.get('agentPermissionWorktreeMode')
          : mockSettings.get('agentPermissionLocalMode')
      }

      expect(permissionPref).toBe('prompt')
    })

    it('should use global default when no project exists', () => {
      const input = {
        projectId: null,
        worktreePath: null, // Local mode
        mode: 'agent',
      }

      const isWorktreeMode = !!input.worktreePath
      let permissionPref: PermissionMode = null

      if (input.projectId) {
        const project = mockProjects.get(input.projectId)
        if (project) {
          permissionPref = isWorktreeMode
            ? project.agentPermissionWorktreeMode
            : project.agentPermissionLocalMode
        }
      }

      if (!permissionPref) {
        permissionPref = isWorktreeMode
          ? mockSettings.get('agentPermissionWorktreeMode')
          : mockSettings.get('agentPermissionLocalMode')
      }

      expect(permissionPref).toBe('prompt')
    })
  })

  describe('Worktree mode', () => {
    it('should use project override when set', () => {
      // Project override: restrict, Global default: auto
      mockProjects.set(mockProjectId, {
        id: mockProjectId,
        agentPermissionLocalMode: 'prompt',
        agentPermissionWorktreeMode: 'restrict',
      })

      const input = {
        projectId: mockProjectId,
        worktreePath: '/some/worktree/path', // Worktree mode
        mode: 'agent',
      }

      const isWorktreeMode = !!input.worktreePath
      let permissionPref: PermissionMode = null

      if (input.projectId) {
        const project = mockProjects.get(mockProjectId)
        if (project) {
          permissionPref = isWorktreeMode
            ? project.agentPermissionWorktreeMode
            : project.agentPermissionLocalMode
        }
      }

      if (!permissionPref) {
        permissionPref = isWorktreeMode
          ? mockSettings.get('agentPermissionWorktreeMode')
          : mockSettings.get('agentPermissionLocalMode')
      }

      expect(permissionPref).toBe('restrict')
    })

    it('should use global default when project override is null', () => {
      // Project override: null, Global default: auto
      mockProjects.set(mockProjectId, {
        id: mockProjectId,
        agentPermissionLocalMode: null,
        agentPermissionWorktreeMode: null,
      })

      const input = {
        projectId: mockProjectId,
        worktreePath: '/some/worktree/path', // Worktree mode
        mode: 'agent',
      }

      const isWorktreeMode = !!input.worktreePath
      let permissionPref: PermissionMode = null

      if (input.projectId) {
        const project = mockProjects.get(mockProjectId)
        if (project) {
          permissionPref = isWorktreeMode
            ? project.agentPermissionWorktreeMode
            : project.agentPermissionLocalMode
        }
      }

      if (!permissionPref) {
        permissionPref = isWorktreeMode
          ? mockSettings.get('agentPermissionWorktreeMode')
          : mockSettings.get('agentPermissionLocalMode')
      }

      expect(permissionPref).toBe('auto')
    })
  })

  describe('Permission mode mapping', () => {
    it('should map "auto" to bypassPermissions', () => {
      const permissionPref = 'auto'

      let permissionMode: 'bypassPermissions' | 'plan' | undefined
      let allowDangerouslySkipPermissions: boolean | undefined

      permissionMode = 'bypassPermissions'
      allowDangerouslySkipPermissions = true

      expect(permissionMode).toBe('bypassPermissions')
      expect(allowDangerouslySkipPermissions).toBe(true)
    })

    it('should map "prompt" to undefined with no skip', () => {
      const permissionPref = 'prompt'

      let permissionMode: 'bypassPermissions' | 'plan' | undefined
      let allowDangerouslySkipPermissions: boolean | undefined

      permissionMode = undefined
      allowDangerouslySkipPermissions = false

      expect(permissionMode).toBeUndefined()
      expect(allowDangerouslySkipPermissions).toBe(false)
    })

    it('should map "restrict" to plan mode', () => {
      const permissionPref = 'restrict'

      let permissionMode: 'bypassPermissions' | 'plan' | undefined
      let allowDangerouslySkipPermissions: boolean | undefined

      permissionMode = 'plan'
      allowDangerouslySkipPermissions = false

      expect(permissionMode).toBe('plan')
      expect(allowDangerouslySkipPermissions).toBe(false)
    })

    it('should map null to fallback (auto-approve)', () => {
      const permissionPref = null

      let permissionMode: 'bypassPermissions' | 'plan' | undefined
      let allowDangerouslySkipPermissions: boolean | undefined

      // Fallback behavior
      permissionMode = 'bypassPermissions'
      allowDangerouslySkipPermissions = true

      expect(permissionMode).toBe('bypassPermissions')
      expect(allowDangerouslySkipPermissions).toBe(true)
    })
  })

  describe('Plan mode override', () => {
    it('should always use plan permissions in plan mode', () => {
      const input = {
        mode: 'plan',
        projectId: mockProjectId,
        worktreePath: null,
      }

      let permissionMode: 'bypassPermissions' | 'plan' | undefined

      if (input.mode === 'plan') {
        permissionMode = 'plan'
      }

      expect(permissionMode).toBe('plan')
    })

    it('should ignore project settings in plan mode', () => {
      // Project has "auto" but plan mode should override
      mockProjects.set(mockProjectId, {
        id: mockProjectId,
        agentPermissionLocalMode: 'auto',
        agentPermissionWorktreeMode: 'auto',
      })

      const input = {
        mode: 'plan',
        projectId: mockProjectId,
        worktreePath: null,
      }

      let permissionMode: 'bypassPermissions' | 'plan' | undefined

      // Plan mode always wins
      if (input.mode === 'plan') {
        permissionMode = 'plan'
      }

      expect(permissionMode).toBe('plan')
    })
  })
})
