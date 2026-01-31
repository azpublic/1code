import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, mkdirSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomBytes } from 'crypto'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { eq } from 'drizzle-orm'

import { promptTemplates } from '../../src/main/lib/db/schema'

const MIGRATIONS_PATH = join(__dirname, '../../drizzle')

/**
 * E2E Test: Prompt Templates System
 *
 * Tests the complete template system with real database operations.
 */

class TemplatesE2ETestEnvironment {
  readonly id: string
  readonly testDir: string
  readonly dbPath: string
  private db: Database.Database
  private client: ReturnType<typeof drizzle>

  constructor() {
    this.id = randomBytes(8).toString('hex')
    const baseDir = join(tmpdir(), `1code-e2e-templates-${this.id}`)
    this.testDir = mkdtempSync(baseDir)
    this.dbPath = join(this.testDir, 'test.db')

    mkdirSync(join(this.dbPath, '..'), { recursive: true })

    this.db = new Database(this.dbPath)
    this.client = drizzle(this.db)

    migrate(this.client, { migrationsFolder: MIGRATIONS_PATH })
  }

  async createTemplate(overrides?: Partial<typeof promptTemplates.$inferInsert>) {
    const template = {
      id: `tpl-${randomBytes(4).toString('hex')}`,
      title: 'Test Template',
      content: 'Test content',
      category: 'test',
      createdAt: new Date(),
      updatedAt: new Date(),
      lastUsedAt: null,
      usageCount: 0,
      ...overrides,
    }

    await this.client.insert(promptTemplates).values(template)
    return template
  }

  async getTemplate(id: string) {
    return this.client.select().from(promptTemplates).where(eq(promptTemplates.id, id)).get()
  }

  async listTemplates() {
    return this.client.select().from(promptTemplates).all()
  }

  cleanup() {
    this.db.close()
    rmSync(this.testDir, { recursive: true, force: true })
  }
}

describe('Templates E2E Tests', () => {
  let env: TemplatesE2ETestEnvironment

  beforeEach(() => {
    env = new TemplatesE2ETestEnvironment()
  })

  afterEach(() => {
    env.cleanup()
  })

  describe('CRUD operations', () => {
    it('should create a new template', async () => {
      const template = await env.createTemplate({
        title: 'Code Review',
        content: 'Please review this code for bugs and improvements',
        category: 'code',
      })

      const retrieved = await env.getTemplate(template.id!)
      expect(retrieved).toBeDefined()
      expect(retrieved?.title).toBe('Code Review')
      expect(retrieved?.content).toBe('Please review this code for bugs and improvements')
      expect(retrieved?.category).toBe('code')
    })

    it('should create template without category', async () => {
      const template = await env.createTemplate({
        title: 'No Category',
        content: 'Content',
        category: null,
      })

      const retrieved = await env.getTemplate(template.id!)
      expect(retrieved?.category).toBeNull()
    })

    it('should update an existing template', async () => {
      const template = await env.createTemplate()

      await env.client.update(promptTemplates)
        .set({ title: 'Updated Title', content: 'Updated content' })
        .where(eq(promptTemplates.id, template.id!))

      const updated = await env.getTemplate(template.id!)
      expect(updated?.title).toBe('Updated Title')
      expect(updated?.content).toBe('Updated content')
    })

    it('should delete a template', async () => {
      const template = await env.createTemplate()

      await env.client.delete(promptTemplates)
        .where(eq(promptTemplates.id, template.id!))

      const deleted = await env.getTemplate(template.id!)
      expect(deleted).toBeUndefined()
    })
  })

  describe('Usage tracking', () => {
    it('should record usage with increment', async () => {
      const template = await env.createTemplate({ usageCount: 5 })

      await env.client.update(promptTemplates)
        .set({
          usageCount: 6,
          lastUsedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(promptTemplates.id, template.id!))

      const updated = await env.getTemplate(template.id!)
      expect(updated?.usageCount).toBe(6)
      expect(updated?.lastUsedAt).not.toBeNull()
    })

    it('should set lastUsedAt on first use', async () => {
      const template = await env.createTemplate({
        lastUsedAt: null,
        usageCount: 0,
      })

      const beforeUse = new Date()
      await env.client.update(promptTemplates)
        .set({
          usageCount: 1,
          lastUsedAt: new Date(),
        })
        .where(eq(promptTemplates.id, template.id!))

      const updated = await env.getTemplate(template.id!)
      expect(updated?.lastUsedAt).not.toBeNull()
      expect(updated?.lastUsedAt!.getTime()).toBeGreaterThanOrEqual(beforeUse.getTime())
    })
  })

  describe('Querying and filtering', () => {
    beforeEach(async () => {
      await env.createTemplate({
        title: 'Code Review',
        content: 'Review the code',
        category: 'code',
        usageCount: 10,
        lastUsedAt: new Date('2024-01-10'),
      })
      await env.createTemplate({
        title: 'Write Tests',
        content: 'Write unit tests',
        category: 'testing',
        usageCount: 5,
        lastUsedAt: new Date('2024-01-05'),
      })
      await env.createTemplate({
        title: 'Documentation',
        content: 'Write documentation',
        category: 'docs',
        usageCount: 0,
        lastUsedAt: null,
      })
    })

    it('should list all templates', async () => {
      const templates = await env.listTemplates()
      expect(templates).toHaveLength(3)
    })

    it('should filter by category', async () => {
      const templates = await env.client.select()
        .from(promptTemplates)
        .where(eq(promptTemplates.category, 'code'))

      expect(templates).toHaveLength(1)
      expect(templates[0].title).toBe('Code Review')
    })
  })

  describe('Edge cases', () => {
    it('should handle special characters in content', async () => {
      const template = await env.createTemplate({
        content: 'Content with <script> and "quotes" and \'apostrophes\'',
      })

      const retrieved = await env.getTemplate(template.id!)
      expect(retrieved?.content).toContain('<script>')
      expect(retrieved?.content).toContain('"quotes"')
    })

    it('should handle unicode content', async () => {
      const template = await env.createTemplate({
        title: '模板 Template 🎉',
        content: 'Content with emoji and 中文',
      })

      const retrieved = await env.getTemplate(template.id!)
      expect(retrieved?.title).toContain('🎉')
      expect(retrieved?.content).toContain('中文')
    })

    it('should handle very long content', async () => {
      const longContent = 'A'.repeat(100_000)
      const template = await env.createTemplate({ content: longContent })

      const retrieved = await env.getTemplate(template.id!)
      expect(retrieved?.content.length).toBe(100_000)
    })
  })
})
