import { mkdtempSync, rmSync, existsSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomBytes } from 'crypto'

/**
 * Creates a mock project with realistic file structure for testing
 */
export class MockProject {
  readonly id: string
  readonly name: string
  readonly path: string
  readonly worktreePath: string | null

  private constructor(
    id: string,
    name: string,
    path: string,
    worktreePath: string | null = null,
  ) {
    this.id = id
    this.name = name
    this.path = path
    this.worktreePath = worktreePath
  }

  /**
   * Create a new mock project
   */
  static create(options?: {
    id?: string
    name?: string
    withWorktree?: boolean
  }): MockProject {
    const id = options?.id || randomBytes(8).toString('hex')
    const name = options?.name || `test-project-${id.slice(0, 8)}`
    const tempBase = join(tmpdir(), `1code-mock-project-${id}`)
    const projectPath = mkdtempSync(tempBase)

    // Create project structure
    mkdirSync(join(projectPath, 'src'), { recursive: true })
    mkdirSync(join(projectPath, 'tests'), { recursive: true })
    mkdirSync(join(projectPath, '.git'), { recursive: true }) // Mock git repo

    // Create some mock files
    writeFileSync(join(projectPath, 'package.json'), JSON.stringify({
      name,
      version: '1.0.0',
      scripts: {
        test: 'vitest',
        build: 'tsc',
      },
    }, null, 2))

    writeFileSync(join(projectPath, 'src', 'index.ts'), `
export function hello(name: string): string {
  return \`Hello, \${name}!\`;
}

console.log(hello('World'));
`)

    writeFileSync(join(projectPath, 'src', 'utils.ts'), `
export const PI = 3.14159;

export function add(a: number, b: number): number {
  return a + b;
}
`)

    writeFileSync(join(projectPath, 'README.md'), `
# ${name}

This is a test project created for E2E testing.

## Features
- TypeScript
- Vitest for testing
`)

    // Create worktree if requested
    let worktreePath: string | null = null
    if (options?.withWorktree) {
      worktreePath = join(tmpdir(), `1code-worktree-${id}`)
      mkdirSync(worktreePath, { recursive: true })

      // Copy some files to worktree
      mkdirSync(join(worktreePath, 'src'), { recursive: true })
      writeFileSync(join(worktreePath, 'src', 'feature.ts'), `
export function newFeature(): string {
  return 'New feature!';
}
`)
    }

    return new MockProject(id, name, projectPath, worktreePath)
  }

  /**
   * Create a test chat associated with this project
   */
  createTestChat(options?: {
    mode?: 'agent' | 'plan'
    useWorktree?: boolean
  }) {
    return {
      id: randomBytes(8).toString('hex'),
      projectId: this.id,
      name: `Test Chat ${this.name}`,
      mode: options?.mode || 'agent',
      useWorktree: options?.useWorktree ?? false,
      worktreePath: options?.useWorktree ? this.worktreePath : null,
    }
  }

  /**
   * Clean up the mock project
   */
  cleanup(): void {
    if (existsSync(this.path)) {
      rmSync(this.path, { recursive: true, force: true })
    }
    if (this.worktreePath && existsSync(this.worktreePath)) {
      rmSync(this.worktreePath, { recursive: true, force: true })
    }
  }

  /**
   * Get a file path relative to project root
   */
  filePath(relativePath: string): string {
    return join(this.path, relativePath)
  }

  /**
   * Create a database entry for this project
   */
  toDbEntry() {
    return {
      id: this.id,
      name: this.name,
      path: this.path,
      createdAt: new Date(),
      updatedAt: new Date(),
      gitRemoteUrl: null,
      gitProvider: null,
      gitOwner: null,
      gitRepo: null,
      worktreeBaseLocation: null,
      sparseCheckoutExclusions: null,
      agentPermissionLocalMode: null,
      agentPermissionWorktreeMode: null,
    }
  }
}
