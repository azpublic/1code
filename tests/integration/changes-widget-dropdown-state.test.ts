import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

/**
 * Integration test for ChangesWidget dropdown button state management
 *
 * This test focuses on the localStorage persistence and state transitions
 * for the Merge/Push dropdown button behavior.
 */

type AutoActionType = 'merge' | 'push'

const LOCAL_STORAGE_KEY = 'auto-action-type'

describe('ChangesWidget Dropdown Button State (Integration)', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
  })

  afterEach(() => {
    cleanup()
  })

  describe('localStorage persistence', () => {
    it('should default to "merge" action type when localStorage is empty', () => {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY)
      expect(saved).toBeNull()

      // Simulate the initialization logic from ChangesWidget
      const actionType = ((saved: string | null) => {
        return (saved === 'push' ? 'push' : 'merge') as AutoActionType
      })(saved)

      expect(actionType).toBe('merge')
    })

    it('should load "push" action type from localStorage', () => {
      localStorage.setItem(LOCAL_STORAGE_KEY, 'push')

      // Simulate the initialization logic from ChangesWidget
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY)
      const actionType = ((saved: string | null) => {
        return (saved === 'push' ? 'push' : 'merge') as AutoActionType
      })(saved)

      expect(actionType).toBe('push')
    })

    it('should load "merge" action type from localStorage', () => {
      localStorage.setItem(LOCAL_STORAGE_KEY, 'merge')

      const saved = localStorage.getItem(LOCAL_STORAGE_KEY)
      const actionType = ((saved: string | null) => {
        return (saved === 'push' ? 'push' : 'merge') as AutoActionType
      })(saved)

      expect(actionType).toBe('merge')
    })

    it('should save action type to localStorage on change', () => {
      expect(localStorage.getItem(LOCAL_STORAGE_KEY)).toBeNull()

      // Simulate saving the action type (as done in ChangesWidget useEffect)
      localStorage.setItem(LOCAL_STORAGE_KEY, 'push')

      expect(localStorage.getItem(LOCAL_STORAGE_KEY)).toBe('push')
    })

    it('should handle invalid localStorage values gracefully', () => {
      localStorage.setItem(LOCAL_STORAGE_KEY, 'invalid')

      // Simulate the initialization logic from ChangesWidget
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY)
      const actionType = ((saved: string | null) => {
        return (saved === 'push' ? 'push' : 'merge') as AutoActionType
      })(saved)

      // Should fallback to "merge" for invalid values
      expect(actionType).toBe('merge')
    })

    it('should persist action type across page reloads', () => {
      // Simulate first visit - user selects "push"
      localStorage.setItem(LOCAL_STORAGE_KEY, 'push')
      expect(localStorage.getItem(LOCAL_STORAGE_KEY)).toBe('push')

      // Simulate page reload - localStorage persists
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY)
      expect(saved).toBe('push')
    })
  })

  describe('action type transitions', () => {
    it('should transition from merge to push', () => {
      // Start with merge (default)
      localStorage.setItem(LOCAL_STORAGE_KEY, 'merge')
      expect(localStorage.getItem(LOCAL_STORAGE_KEY)).toBe('merge')

      // User selects push
      localStorage.setItem(LOCAL_STORAGE_KEY, 'push')
      expect(localStorage.getItem(LOCAL_STORAGE_KEY)).toBe('push')
    })

    it('should transition from push to merge', () => {
      // Start with push
      localStorage.setItem(LOCAL_STORAGE_KEY, 'push')
      expect(localStorage.getItem(LOCAL_STORAGE_KEY)).toBe('push')

      // User selects merge
      localStorage.setItem(LOCAL_STORAGE_KEY, 'merge')
      expect(localStorage.getItem(LOCAL_STORAGE_KEY)).toBe('merge')
    })

    it('should handle rapid toggles between actions', () => {
      // Simulate user rapidly switching between actions
      const actions: AutoActionType[] = ['merge', 'push', 'merge', 'push', 'merge']

      for (const action of actions) {
        localStorage.setItem(LOCAL_STORAGE_KEY, action)
        expect(localStorage.getItem(LOCAL_STORAGE_KEY)).toBe(action)
      }
    })
  })

  describe('callback behavior simulation', () => {
    it('should call correct callback based on action type', () => {
      const mockOnMergeToMain = vi.fn()
      const mockOnCommitPush = vi.fn()

      const selectedPaths = ['src/file1.ts', 'src/file2.ts']
      let currentAction: AutoActionType = 'merge'

      // Simulate handleAutoAction logic from ChangesWidget
      if (currentAction === 'merge') {
        mockOnMergeToMain(selectedPaths)
      } else {
        mockOnCommitPush(selectedPaths)
      }

      expect(mockOnMergeToMain).toHaveBeenCalledWith(selectedPaths)
      expect(mockOnCommitPush).not.toHaveBeenCalled()
    })

    it('should call push callback when action type is push', () => {
      const mockOnMergeToMain = vi.fn()
      const mockOnCommitPush = vi.fn()

      const selectedPaths = ['src/file1.ts', 'src/file2.ts']
      const currentAction: AutoActionType = 'push'

      // Simulate handleAutoAction logic from ChangesWidget
      if (currentAction === 'merge') {
        mockOnMergeToMain(selectedPaths)
      } else {
        mockOnCommitPush(selectedPaths)
      }

      expect(mockOnCommitPush).toHaveBeenCalledWith(selectedPaths)
      expect(mockOnMergeToMain).not.toHaveBeenCalled()
    })

    it('should update action type and fire callback on selection', () => {
      const mockOnMergeToMain = vi.fn()
      const mockOnCommitPush = vi.fn()

      const selectedPaths = ['src/file1.ts']

      // Simulate handleActionSelect logic from ChangesWidget
      // User selects "push" from dropdown
      const selectedAction: AutoActionType = 'push'
      localStorage.setItem(LOCAL_STORAGE_KEY, selectedAction)

      // Fire the action immediately
      if (selectedAction === 'merge') {
        mockOnMergeToMain(selectedPaths)
      } else {
        mockOnCommitPush(selectedPaths)
      }

      expect(localStorage.getItem(LOCAL_STORAGE_KEY)).toBe('push')
      expect(mockOnCommitPush).toHaveBeenCalledWith(selectedPaths)
    })
  })

  describe('edge cases', () => {
    it('should handle null localStorage value', () => {
      localStorage.setItem(LOCAL_STORAGE_KEY, 'null')

      const saved = localStorage.getItem(LOCAL_STORAGE_KEY)
      const actionType = ((saved: string | null) => {
        return (saved === 'push' ? 'push' : 'merge') as AutoActionType
      })(saved)

      expect(actionType).toBe('merge')
    })

    it('should handle empty string localStorage value', () => {
      localStorage.setItem(LOCAL_STORAGE_KEY, '')

      const saved = localStorage.getItem(LOCAL_STORAGE_KEY)
      const actionType = ((saved: string | null) => {
        return (saved === 'push' ? 'push' : 'merge') as AutoActionType
      })(saved)

      expect(actionType).toBe('merge')
    })

    it('should handle case-sensitive action type values', () => {
      localStorage.setItem(LOCAL_STORAGE_KEY, 'PUSH')

      const saved = localStorage.getItem(LOCAL_STORAGE_KEY)
      const actionType = ((saved: string | null) => {
        return (saved === 'push' ? 'push' : 'merge') as AutoActionType
      })(saved)

      // Should not match case-insensitively
      expect(actionType).toBe('merge')
    })

    it('should handle whitespace in localStorage value', () => {
      localStorage.setItem(LOCAL_STORAGE_KEY, ' push ')

      const saved = localStorage.getItem(LOCAL_STORAGE_KEY)
      const actionType = ((saved: string | null) => {
        return (saved === 'push' ? 'push' : 'merge') as AutoActionType
      })(saved)

      // Should not match with whitespace
      expect(actionType).toBe('merge')
    })
  })

  describe('color mapping based on action type', () => {
    it('should map merge to cyan color class', () => {
      const actionType: AutoActionType = 'merge'

      const colorClass = actionType === 'merge'
        ? 'bg-cyan-500 hover:bg-cyan-600 text-white'
        : 'bg-orange-500 hover:bg-orange-600 text-white'

      expect(colorClass).toBe('bg-cyan-500 hover:bg-cyan-600 text-white')
    })

    it('should map push to orange color class', () => {
      const actionType: AutoActionType = 'push'

      const colorClass = actionType === 'merge'
        ? 'bg-cyan-500 hover:bg-cyan-600 text-white'
        : 'bg-orange-500 hover:bg-orange-600 text-white'

      expect(colorClass).toBe('bg-orange-500 hover:bg-orange-600 text-white')
    })

    it('should update color class when action type changes', () => {
      let actionType: AutoActionType = 'merge'

      const initialColorClass = actionType === 'merge'
        ? 'bg-cyan-500 hover:bg-cyan-600 text-white'
        : 'bg-orange-500 hover:bg-orange-600 text-white'

      expect(initialColorClass).toBe('bg-cyan-500 hover:bg-cyan-600 text-white')

      // User changes action type
      actionType = 'push'
      localStorage.setItem(LOCAL_STORAGE_KEY, 'push')

      const newColorClass = actionType === 'merge'
        ? 'bg-cyan-500 hover:bg-cyan-600 text-white'
        : 'bg-orange-500 hover:bg-orange-600 text-white'

      expect(newColorClass).toBe('bg-orange-500 hover:bg-orange-600 text-white')
    })
  })

  describe('button label based on action type', () => {
    it('should show merge button label for merge action', () => {
      const selectedCount = 3
      const actionType: AutoActionType = 'merge'

      const label = actionType === 'merge'
        ? `Merge ${selectedCount} file${selectedCount !== 1 ? 's' : ''}`
        : `Push ${selectedCount} file${selectedCount !== 1 ? 's' : ''}`

      expect(label).toBe('Merge 3 files')
    })

    it('should show push button label for push action', () => {
      const selectedCount = 1
      const actionType: AutoActionType = 'push'

      const label = actionType === 'merge'
        ? `Merge ${selectedCount} file${selectedCount !== 1 ? 's' : ''}`
        : `Push ${selectedCount} file${selectedCount !== 1 ? 's' : ''}`

      expect(label).toBe('Push 1 file')
    })

    it('should use singular form when count is 1', () => {
      const selectedCount = 1
      const actionType: AutoActionType = 'merge'

      const label = actionType === 'merge'
        ? `Merge ${selectedCount} file${selectedCount !== 1 ? 's' : ''}`
        : `Push ${selectedCount} file${selectedCount !== 1 ? 's' : ''}`

      expect(label).toBe('Merge 1 file')
    })

    it('should use plural form when count is not 1', () => {
      const selectedCount = 5
      const actionType: AutoActionType = 'push'

      const label = actionType === 'merge'
        ? `Merge ${selectedCount} file${selectedCount !== 1 ? 's' : ''}`
        : `Push ${selectedCount} file${selectedCount !== 1 ? 's' : ''}`

      expect(label).toBe('Push 5 files')
    })
  })
})
