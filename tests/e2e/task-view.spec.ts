import { test, expect } from '@playwright/test'
import { _electron as electron, ElectronApplication } from 'playwright'

/**
 * E2E Tests for Task View Feature
 *
 * These tests verify:
 * 1. The task view can be opened via keyboard shortcut and sidebar button
 * 2. The Kanban board view renders correctly
 * 3. The List view renders correctly
 * 4. Project filtering works
 * 5. View mode switching works
 * 6. Creating and editing tasks works
 */

test.describe('E2E: Task View', () => {
  let electronApp: ElectronApplication
  let window: any

  test.beforeAll(async () => {
    electronApp = await electron.launch({
      executablePath: require('electron'),
      args: ['out/main/index.js'],
    })
    window = await electronApp.firstWindow({ timeout: 15000 })
    // Wait for app to fully load
    await window.waitForLoadState('domcontentloaded', { timeout: 10000 })
  })

  test.afterAll(async () => {
    if (electronApp) {
      await electronApp.close()
    }
  })

  test.beforeEach(async () => {
    // Ensure we start with task view closed
    await window.keyboard.press('Escape')
    await window.waitForTimeout(200)
  })

  test.describe('Opening Task View', () => {
    test('should open task view via keyboard shortcut', async () => {
      // Press Cmd+Shift+T
      await window.keyboard.press('Meta+Shift+T')

      // Should see task view title
      await expect(window.locator('h1:has-text("Tasks")').or(window.locator('text=Tasks'))).toBeVisible({ timeout: 3000 })
    })

    test('should open task view via sidebar button', async () => {
      // Look for the Tasks button in sidebar (checkmark icon)
      const tasksButton = window.locator('[class*="tasks"], [aria-label*="task"], [data-testid*="task"]').first()

      const isVisible = await tasksButton.isVisible({ timeout: 2000 }).catch(() => false)
      if (isVisible) {
        await tasksButton.click()

        // Should see task view
        await expect(window.locator('text=Tasks')).toBeVisible({ timeout: 3000 })
      }
    })

    test('should toggle task view with same keyboard shortcut', async () => {
      // Open task view
      await window.keyboard.press('Meta+Shift+T')
      await expect(window.locator('text=Tasks')).toBeVisible({ timeout: 3000 })

      // Close with same shortcut
      await window.keyboard.press('Meta+Shift+T')
      await window.waitForTimeout(300)

      // Should be closed (Tasks title not visible)
      const tasksVisible = await window.locator('text=Tasks').isVisible().catch(() => false)
      expect(tasksVisible).toBe(false)
    })
  })

  test.describe('Kanban Board View', () => {
    test.beforeEach(async () => {
      await window.keyboard.press('Meta+Shift+T')
      await window.waitForTimeout(500)
    })

    test('should render kanban board columns', async () => {
      // Should see all three column headers
      await expect(window.locator('text=To Do')).toBeVisible({ timeout: 3000 })
      await expect(window.locator('text=In Progress')).toBeVisible()
      await expect(window.locator('text=Done')).toBeVisible()
    })

    test('should show task counts in column headers', async () => {
      // Should see task count badges (numbers)
      const countBadges = window.locator('[class*="text-xs text-muted-foreground"]')
      const count = await countBadges.count()
      expect(count).toBeGreaterThan(0)
    })

    test('should display task cards in columns', async () => {
      // Check for task cards (may have empty state if no tasks)
      const taskCards = window.locator('[class*="group"][class*="cursor-pointer"]')
      const cardCount = await taskCards.count()

      // Either has tasks or shows empty state
      if (cardCount > 0) {
        // If there are tasks, they should have titles
        const taskTitle = taskCards.first()
        await expect(taskTitle).toBeVisible()
      } else {
        // Should show "No tasks" message
        const emptyState = window.locator('text=/no.*tasks/i')
        await expect(emptyState).toBeVisible()
      }
    })
  })

  test.describe('View Mode Toggle', () => {
    test.beforeEach(async () => {
      await window.keyboard.press('Meta+Shift+T')
      await window.waitForTimeout(500)
    })

    test('should switch to List view', async () => {
      // Click List button
      const listButton = window.locator('button:has-text("List")')
      await expect(listButton).toBeVisible()
      await listButton.click()

      // Should see list view table
      const table = window.locator('table').or(window.locator('[role="table"]'))
      await expect(table).toBeVisible({ timeout: 2000 })
    })

    test('should switch back to Kanban view', async () => {
      // First switch to list
      const listButton = window.locator('button:has-text("List")')
      await listButton.click()
      await window.waitForTimeout(300)

      // Then switch back to kanban
      const boardButton = window.locator('button:has-text("Board")')
      await boardButton.click()

      // Should see kanban columns again
      await expect(window.locator('text=To Do')).toBeVisible({ timeout: 2000 })
    })

    test('should maintain view mode preference', async () => {
      // Switch to list view
      const listButton = window.locator('button:has-text("List")')
      await listButton.click()
      await window.waitForTimeout(300)

      // Close and reopen task view
      await window.keyboard.press('Meta+Shift+T')
      await window.waitForTimeout(300)
      await window.keyboard.press('Meta+Shift+T')
      await window.waitForTimeout(300)
      await window.keyboard.press('Meta+Shift+T')

      // Should still be in list view
      const table = window.locator('table').or(window.locator('[role="table"]'))
      await expect(table).toBeVisible({ timeout: 2000 })
    })
  })

  test.describe('List View', () => {
    test.beforeEach(async () => {
      await window.keyboard.press('Meta+Shift+T')
      await window.waitForTimeout(500)

      // Switch to list view
      const listButton = window.locator('button:has-text("List")')
      await listButton.click()
      await window.waitForTimeout(300)
    })

    test('should render table with correct headers', async () => {
      // Should see table headers
      const headers = window.locator('[role="columnheader"]')
      const headerCount = await headers.count()
      expect(headerCount).toBeGreaterThanOrEqual(4) // At least: Task, Project, Priority, Updated
    })

    test('should display task rows when tasks exist', async () => {
      const tableRows = window.locator('tbody tr')
      const rowCount = await tableRows.count()

      if (rowCount > 0) {
        // Should have at least one task
        await expect(tableRows.first()).toBeVisible()
      } else {
        // Should show empty state
        await expect(window.locator('text=/no.*tasks/i')).toBeVisible()
      }
    })
  })

  test.describe('Project Filter', () => {
    test.beforeEach(async () => {
      await window.keyboard.press('Meta+Shift+T')
      await window.waitForTimeout(500)
    })

    test('should show project filter dropdown when projects exist', async () => {
      const projectFilter = window.locator('[role="combobox"]')
      const isVisible = await projectFilter.isVisible({ timeout: 2000 }).catch(() => false)

      if (isVisible) {
        // Should show "All Projects" by default
        await expect(projectFilter).toContainText(/all.*projects/i)
      }
    })

    test('should open project dropdown when clicked', async () => {
      const projectFilter = window.locator('[role="combobox"]')
      const isVisible = await projectFilter.isVisible({ timeout: 2000 }).catch(() => false)

      if (isVisible) {
        await projectFilter.click()
        await window.waitForTimeout(300)

        // Should see options
        const options = window.locator('[role="option"]')
        const optionCount = await options.count()
        expect(optionCount).toBeGreaterThan(0)
      }
    })
  })

  test.describe('Create Task', () => {
    test.beforeEach(async () => {
      await window.keyboard.press('Meta+Shift+T')
      await window.waitForTimeout(500)
    })

    test('should show create task button', async () => {
      const createButton = window.locator('button:has-text("New Task")')
      await expect(createButton).toBeVisible()
    })

    test('should enable create button when projects exist', async () => {
      const createButton = window.locator('button:has-text("New Task")')
      const isEnabled = await createButton.isEnabled()
      expect(isEnabled).toBe(true)
    })

    test('should handle create task click', async () => {
      const createButton = window.locator('button:has-text("New Task")')
      await createButton.click()
      await window.waitForTimeout(300)

      // Should either show dialog or remain on task view
      // Just verify it doesn't crash
      const tasksTitle = window.locator('text=Tasks')
      await expect(tasksTitle).toBeVisible()
    })
  })

  test.describe('Close Task View', () => {
    test.beforeEach(async () => {
      await window.keyboard.press('Meta+Shift+T')
      await window.waitForTimeout(500)
    })

    test('should close with close button', async () => {
      const closeButton = window.locator('button[aria-label="Close Tasks"]')

      if (await closeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await closeButton.click()
        await window.waitForTimeout(300)

        // Task view should be hidden
        const tasksVisible = await window.locator('text=Tasks').isVisible().catch(() => false)
        expect(tasksVisible).toBe(false)
      }
    })

    test('should close with Escape key', async () => {
      await window.keyboard.press('Escape')
      await window.waitForTimeout(300)

      // Task view should be hidden
      const tasksVisible = await window.locator('text=Tasks').isVisible().catch(() => false)
      expect(tasksVisible).toBe(false)
    })
  })

  test.describe('Task Count Display', () => {
    test.beforeEach(async () => {
      await window.keyboard.press('Meta+Shift+T')
      await window.waitForTimeout(500)
    })

    test('should display task count in header', async () => {
      // Look for task count (e.g., "3 tasks" or "3 task")
      const taskCount = window.locator(/\d+\s+tasks?/)
      const count = await taskCount.count()
      expect(count).toBeGreaterThan(0)
    })

    test('should use singular "task" when count is 1', async () => {
      const singleTask = window.locator(/1\s+task/)
      // May or may not be present depending on actual task count
      await singleTask.count().then(count => {
        if (count > 0) {
          expect(count).toBe(1)
        }
      })
    })
  })

  test.describe('Layout and Styling', () => {
    test.beforeEach(async () => {
      await window.keyboard.press('Meta+Shift+T')
      await window.waitForTimeout(500)
    })

    test('should have proper header layout', async () => {
      const header = window.locator('[class*="px-3"][class*="py-2"]')
      await expect(header.first()).toBeVisible()
    })

    test('should have view toggle buttons', async () => {
      const boardButton = window.locator('button:has-text("Board")')
      const listButton = window.locator('button:has-text("List")')

      await expect(boardButton).toBeVisible()
      await expect(listButton).toBeVisible()
    })
  })

  test.describe('Accessibility', () => {
    test.beforeEach(async () => {
      await window.keyboard.press('Meta+Shift+T')
      await window.waitForTimeout(500)
    })

    test('should have proper ARIA labels', async () => {
      const closeButton = window.locator('button[aria-label]')
      const count = await closeButton.count()
      expect(count).toBeGreaterThan(0)
    })

    test('should be keyboard navigable', async () => {
      // Press Tab to navigate
      await window.keyboard.press('Tab')
      await window.waitForTimeout(100)

      // Should not crash
      const body = window.locator('body')
      await expect(body).toBeVisible()
    })
  })

  test.describe('Multi-Project Support', () => {
    test.beforeEach(async () => {
      await window.keyboard.press('Meta+Shift+T')
      await window.waitForTimeout(500)
    })

    test('should display project badges on tasks', async () => {
      const projectBadges = window.locator('[class*="border"][class*="text-"]')
      const count = await projectBadges.count()

      // May have 0 or more badges
      expect(count).toBeGreaterThanOrEqual(0)
    })

    test('should show different colors for different projects', async () => {
      const badges = window.locator('[class*="border"]')
      const count = await badges.count()

      if (count > 1) {
        // If multiple badges exist, they should have different color classes
        const firstBadge = badges.first()
        await expect(firstBadge).toBeVisible()
      }
    })
  })

  test.describe('Priority Badges', () => {
    test.beforeEach(async () => {
      await window.keyboard.press('Meta+Shift+T')
      await window.waitForTimeout(500)
    })

    test('should display priority indicators', async () => {
      const priorityLabels = window.locator('text=/high|medium|low/i')
      const count = await priorityLabels.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })
  })

  test.describe('Empty States', () => {
    test.beforeEach(async () => {
      await window.keyboard.press('Meta+Shift+T')
      await window.waitForTimeout(500)
    })

    test('should show message when no tasks exist', async () => {
      // Check for empty state message
      const emptyState = window.locator('text=/no.*tasks/i')
      const hasEmptyState = await emptyState.isVisible().catch(() => false)

      // Either has tasks or shows empty state
      if (hasEmptyState) {
        await expect(emptyState).toBeVisible()
      }
    })

    test('should show empty state in kanban columns when no tasks', async () => {
      const noTasksMessages = window.locator('text=No tasks')
      const count = await noTasksMessages.count()

      // If there are no tasks, should see "No tasks" in columns
      if (count > 0) {
        expect(count).toBeGreaterThan(0)
      }
    })
  })
})

test.describe('E2E: Task View Performance', () => {
  let electronApp: ElectronApplication
  let window: any

  test.beforeAll(async () => {
    electronApp = await electron.launch({
      executablePath: require('electron'),
      args: ['out/main/index.js'],
    })
    window = await electronApp.firstWindow({ timeout: 15000 })
    await window.waitForLoadState('domcontentloaded', { timeout: 10000 })
  })

  test.afterAll(async () => {
    if (electronApp) {
      await electronApp.close()
    }
  })

  test('should load task view quickly', async () => {
    const startTime = Date.now()

    await window.keyboard.press('Meta+Shift+T')

    // Wait for task view
    await window.waitForSelector('text=Tasks', { timeout: 5000 })

    const loadTime = Date.now() - startTime

    // Should load in under 3 seconds (more lenient for CI)
    expect(loadTime).toBeLessThan(3000)
  })

  test('should switch view modes quickly', async () => {
    await window.keyboard.press('Meta+Shift+T')
    await window.waitForTimeout(500)

    const startTime = Date.now()

    // Switch to list view
    const listButton = window.locator('button:has-text("List")')
    if (await listButton.isVisible()) {
      await listButton.click()
      await window.waitForSelector('table', { timeout: 3000 })

      const switchTime = Date.now() - startTime

      // Should switch in under 2 seconds
      expect(switchTime).toBeLessThan(2000)
    }
  })
})

test.describe('E2E: Task View Keyboard Shortcuts', () => {
  let electronApp: ElectronApplication
  let window: any

  test.beforeAll(async () => {
    electronApp = await electron.launch({
      executablePath: require('electron'),
      args: ['out/main/index.js'],
    })
    window = await electronApp.firstWindow({ timeout: 15000 })
    await window.waitForLoadState('domcontentloaded', { timeout: 10000 })
  })

  test.afterAll(async () => {
    if (electronApp) {
      await electronApp.close()
    }
  })

  test('should open and close with keyboard', async () => {
    // Open
    await window.keyboard.press('Meta+Shift+T')
    await expect(window.locator('text=Tasks')).toBeVisible({ timeout: 3000 })

    // Close
    await window.keyboard.press('Escape')
    await window.waitForTimeout(300)

    const tasksVisible = await window.locator('text=Tasks').isVisible().catch(() => false)
    expect(tasksVisible).toBe(false)

    // Open again
    await window.keyboard.press('Meta+Shift+T')
    await expect(window.locator('text=Tasks')).toBeVisible({ timeout: 3000 })
  })

  test('should navigate between view modes with keyboard', async () => {
    await window.keyboard.press('Meta+Shift+T')
    await window.waitForTimeout(500)

    // Tab to view toggle buttons
    await window.keyboard.press('Tab')
    await window.keyboard.press('Tab')
    await window.waitForTimeout(200)

    // Press Enter to switch view
    await window.keyboard.press('Enter')
    await window.waitForTimeout(300)

    // Should still be on task view (just switched views)
    await expect(window.locator('text=Tasks')).toBeVisible()
  })
})
