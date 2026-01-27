import { tmpdir } from 'os'
import { join } from 'path'
import { mkdtempSync, rmSync, existsSync } from 'fs'
import { randomBytes } from 'crypto'

/**
 * Creates an isolated test environment with temporary directories
 * for database, settings, and cache.
 *
 * Each test gets its own isolated environment to avoid conflicts.
 */
export class TestEnvironment {
  readonly id: string
  readonly testDir: string
  readonly dbPath: string
  readonly settingsPath: string
  readonly cachePath: string

  private constructor(id: string) {
    this.id = id
    // Create a unique temp directory for this test
    const baseDir = join(tmpdir(), `1code-test-${id}`)
    this.testDir = mkdtempSync(baseDir)

    // Set up paths for this test environment
    this.dbPath = join(this.testDir, 'data', 'agents.db')
    this.settingsPath = join(this.testDir, 'settings.json')
    this.cachePath = join(this.testDir, 'cache')
  }

  /**
   * Create a new test environment
   */
  static create(): TestEnvironment {
    const id = randomBytes(8).toString('hex')
    return new TestEnvironment(id)
  }

  /**
   * Clean up the test environment
   */
  cleanup(): void {
    if (existsSync(this.testDir)) {
      rmSync(this.testDir, { recursive: true, force: true })
    }
  }

  /**
   * Get environment variables to pass to the Electron app
   * This overrides the default userData path
   */
  getEnv(): NodeJS.ProcessEnv {
    return {
      ...process.env,
      // Override userData to use our test directory
      TEST_USER_DATA_PATH: this.testDir,
      // Disable auto-updates in tests
      TEST_DISABLE_UPDATES: '1',
      // Use a test-specific database
      TEST_DB_PATH: this.dbPath,
    }
  }

  /**
   * Create initial settings file with defaults
   */
  async createInitialSettings(settings: Record<string, unknown> = {}): Promise<void> {
    const fs = await import('fs/promises')
    const defaults = {
      // Default settings for tests
      agentPermissionLocalMode: 'prompt',
      agentPermissionWorktreeMode: 'auto',
      interviewTimeoutSeconds: 60,
      autoUpdateCheckEnabled: false,
      analyticsOptOut: true,
      ...settings,
    }

    await fs.mkdir(this.testDir, { recursive: true })
    await fs.writeFile(this.settingsPath, JSON.stringify(defaults, null, 2))
  }

  /**
   * Create test projects in the database
   */
  async createTestProject(project: {
    id: string
    name: string
    path: string
    agentPermissionLocalMode?: string | null
    agentPermissionWorktreeMode?: string | null
  }): Promise<void> {
    const Database = await import('better-sqlite3')
    const { drizzle } = await import('drizzle-orm/better-sqlite3')
    const { projects } = await import('../../../src/main/lib/db/schema')

    // Ensure database directory exists
    const fs = await import('fs/promises')
    await fs.mkdir(join(this.dbPath, '..'), { recursive: true })

    // Create and initialize database
    const db = new Database.default(this.dbPath)
    const client = drizzle(db)

    // Insert test project
    await client.insert(projects).values({
      id: project.id,
      name: project.name,
      path: project.path,
      agentPermissionLocalMode: project.agentPermissionLocalMode ?? null,
      agentPermissionWorktreeMode: project.agentPermissionWorktreeMode ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    db.close()
  }
}
