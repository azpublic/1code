import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getDefaultStore } from 'jotai'

// Mock the settings storage before importing the atoms
// Use a factory function to avoid hoisting issues
const mockStorage = new Map<string, string>()

vi.mock('../../../src/renderer/lib/settings-storage', () => {
  const storage = new Map<string, string>()
  return {
    createSettingsStorage: <T>() => ({
      getItem: (key: string) => {
        const value = storage.get(key)
        return value ? JSON.parse(value) as T : null
      },
      setItem: (key: string, value: T) => {
        storage.set(key, JSON.stringify(value))
      },
      removeItem: (key: string) => {
        storage.delete(key)
      },
    }),
  }
})

// Import the atoms after mocking
import {
  agentPermissionLocalModeAtom,
  agentPermissionWorktreeModeAtom,
} from '../../../src/renderer/features/agents/atoms'

describe('Agent Permission Atoms', () => {
  const store = getDefaultStore()

  beforeEach(() => {
    // Reset store to default values before each test
    store.set(agentPermissionLocalModeAtom, 'prompt')
    store.set(agentPermissionWorktreeModeAtom, 'auto')
  })

  describe('agentPermissionLocalModeAtom', () => {
    it('should have default value of "prompt"', () => {
      const value = store.get(agentPermissionLocalModeAtom)
      expect(value).toBe('prompt')
    })

    it('should allow setting valid permission modes', () => {
      store.set(agentPermissionLocalModeAtom, 'auto')
      expect(store.get(agentPermissionLocalModeAtom)).toBe('auto')

      store.set(agentPermissionLocalModeAtom, 'prompt')
      expect(store.get(agentPermissionLocalModeAtom)).toBe('prompt')

      store.set(agentPermissionLocalModeAtom, 'restrict')
      expect(store.get(agentPermissionLocalModeAtom)).toBe('restrict')
    })
  })

  describe('agentPermissionWorktreeModeAtom', () => {
    it('should have default value of "auto"', () => {
      const value = store.get(agentPermissionWorktreeModeAtom)
      expect(value).toBe('auto')
    })

    it('should allow setting valid permission modes', () => {
      store.set(agentPermissionWorktreeModeAtom, 'prompt')
      expect(store.get(agentPermissionWorktreeModeAtom)).toBe('prompt')

      store.set(agentPermissionWorktreeModeAtom, 'auto')
      expect(store.get(agentPermissionWorktreeModeAtom)).toBe('auto')

      store.set(agentPermissionWorktreeModeAtom, 'restrict')
      expect(store.get(agentPermissionWorktreeModeAtom)).toBe('restrict')
    })
  })

  describe('permission mode values', () => {
    it('should support all valid permission modes', () => {
      const validModes = ['auto', 'prompt', 'restrict'] as const

      for (const mode of validModes) {
        store.set(agentPermissionLocalModeAtom, mode)
        expect(store.get(agentPermissionLocalModeAtom)).toBe(mode)

        store.set(agentPermissionWorktreeModeAtom, mode)
        expect(store.get(agentPermissionWorktreeModeAtom)).toBe(mode)
      }
    })
  })
})
