import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getDefaultStore } from 'jotai'

// Mock the settings storage before importing the atoms
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
  taskViewModeAtom,
  taskViewFocusAtom,
  taskViewVisibleAtom,
} from '../../../src/renderer/features/tasks/atoms'

describe('Task View Atoms', () => {
  const store = getDefaultStore()

  beforeEach(() => {
    // Reset store to default values before each test
    store.set(taskViewModeAtom, 'kanban')
    store.set(taskViewFocusAtom, 'all')
    store.set(taskViewVisibleAtom, false)
  })

  describe('taskViewModeAtom', () => {
    it('should have default value of "kanban"', () => {
      const value = store.get(taskViewModeAtom)
      expect(value).toBe('kanban')
    })

    it('should allow switching to "list" mode', () => {
      store.set(taskViewModeAtom, 'list')
      expect(store.get(taskViewModeAtom)).toBe('list')
    })

    it('should allow switching back to "kanban" mode', () => {
      store.set(taskViewModeAtom, 'list')
      store.set(taskViewModeAtom, 'kanban')
      expect(store.get(taskViewModeAtom)).toBe('kanban')
    })

    it('should only accept valid view modes', () => {
      const validModes = ['kanban', 'list'] as const

      for (const mode of validModes) {
        store.set(taskViewModeAtom, mode)
        expect(store.get(taskViewModeAtom)).toBe(mode)
      }
    })
  })

  describe('taskViewFocusAtom', () => {
    it('should have default value of "all"', () => {
      const value = store.get(taskViewFocusAtom)
      expect(value).toBe('all')
    })

    it('should allow setting to a specific project ID', () => {
      const projectId = 'test-project-id'
      store.set(taskViewFocusAtom, projectId)
      expect(store.get(taskViewFocusAtom)).toBe(projectId)
    })

    it('should allow switching back to "all" from a specific project', () => {
      store.set(taskViewFocusAtom, 'specific-project-id')
      store.set(taskViewFocusAtom, 'all')
      expect(store.get(taskViewFocusAtom)).toBe('all')
    })

    it('should accept any string value as project ID', () => {
      const projectIds = ['proj-1', 'proj-2', 'abc123', 'project-with-dashes']

      for (const projectId of projectIds) {
        store.set(taskViewFocusAtom, projectId)
        expect(store.get(taskViewFocusAtom)).toBe(projectId)
      }
    })
  })

  describe('taskViewVisibleAtom', () => {
    it('should have default value of false', () => {
      const value = store.get(taskViewVisibleAtom)
      expect(value).toBe(false)
    })

    it('should allow setting to true', () => {
      store.set(taskViewVisibleAtom, true)
      expect(store.get(taskViewVisibleAtom)).toBe(true)
    })

    it('should allow toggling between true and false', () => {
      expect(store.get(taskViewVisibleAtom)).toBe(false)

      store.set(taskViewVisibleAtom, true)
      expect(store.get(taskViewVisibleAtom)).toBe(true)

      store.set(taskViewVisibleAtom, false)
      expect(store.get(taskViewVisibleAtom)).toBe(false)

      store.set(taskViewVisibleAtom, true)
      expect(store.get(taskViewVisibleAtom)).toBe(true)
    })
  })

  describe('task view state combinations', () => {
    it('should maintain independent state for all atoms', () => {
      // Set all atoms to specific values
      store.set(taskViewModeAtom, 'list')
      store.set(taskViewFocusAtom, 'project-123')
      store.set(taskViewVisibleAtom, true)

      // Verify all values are independent
      expect(store.get(taskViewModeAtom)).toBe('list')
      expect(store.get(taskViewFocusAtom)).toBe('project-123')
      expect(store.get(taskViewVisibleAtom)).toBe(true)

      // Change one value should not affect others
      store.set(taskViewModeAtom, 'kanban')
      expect(store.get(taskViewModeAtom)).toBe('kanban')
      expect(store.get(taskViewFocusAtom)).toBe('project-123')
      expect(store.get(taskViewVisibleAtom)).toBe(true)
    })

    it('should represent typical task view workflows', () => {
      // Workflow 1: User opens tasks (defaults)
      store.set(taskViewVisibleAtom, true)
      expect(store.get(taskViewVisibleAtom)).toBe(true)
      expect(store.get(taskViewModeAtom)).toBe('kanban')
      expect(store.get(taskViewFocusAtom)).toBe('all')

      // Workflow 2: User switches to list view
      store.set(taskViewModeAtom, 'list')
      expect(store.get(taskViewModeAtom)).toBe('list')
      expect(store.get(taskViewFocusAtom)).toBe('all')

      // Workflow 3: User filters to specific project
      store.set(taskViewFocusAtom, 'project-abc')
      expect(store.get(taskViewFocusAtom)).toBe('project-abc')

      // Workflow 4: User closes task view
      store.set(taskViewVisibleAtom, false)
      expect(store.get(taskViewVisibleAtom)).toBe(false)
      // Mode and focus should persist for next opening
      expect(store.get(taskViewModeAtom)).toBe('list')
      expect(store.get(taskViewFocusAtom)).toBe('project-abc')
    })
  })
})
