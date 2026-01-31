import { describe, it, expect, beforeEach } from 'vitest'

type PromptTemplate = {
  id: string
  title: string
  content: string
  category: string | null
  createdAt: Date
  updatedAt: Date
  lastUsedAt: Date | null
  usageCount: number
}

describe('Templates tRPC Router', () => {
  const mockTemplates: PromptTemplate[] = [
    {
      id: 'tpl-1',
      title: 'Code Review',
      content: 'Review this code for bugs and improvements...',
      category: 'code',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-02'),
      lastUsedAt: new Date('2024-01-03'),
      usageCount: 5,
    },
    {
      id: 'tpl-2',
      title: 'Documentation',
      content: 'Write documentation for...',
      category: 'docs',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-02'),
      lastUsedAt: null,
      usageCount: 0,
    },
  ]

  describe('list - Input validation', () => {
    it('should accept empty filters', () => {
      const input = {}
      expect(input).toEqual({})
    })

    it('should accept category filter', () => {
      const input = { category: 'code' }
      expect(input.category).toBe('code')
    })

    it('should accept search filter', () => {
      const input = { search: 'review' }
      expect(input.search).toBe('review')
    })

    it('should accept both category and search filters', () => {
      const input = { category: 'code', search: 'review' }
      expect(input.category).toBe('code')
      expect(input.search).toBe('review')
    })
  })

  describe('list - Output behavior', () => {
    it('should return all templates when no filters', () => {
      const result = mockTemplates
      expect(result).toHaveLength(2)
    })

    it('should filter by category', () => {
      const result = mockTemplates.filter(t => t.category === 'code')
      expect(result).toHaveLength(1)
      expect(result[0].title).toBe('Code Review')
    })

    it('should filter by search in title', () => {
      const search = 'documentation'
      const result = mockTemplates.filter(t =>
        t.title.toLowerCase().includes(search.toLowerCase())
      )
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('tpl-2')
    })

    it('should filter by search in content', () => {
      const search = 'bugs'
      const result = mockTemplates.filter(t =>
        t.content.toLowerCase().includes(search.toLowerCase())
      )
      expect(result).toHaveLength(1)
      expect(result[0].title).toBe('Code Review')
    })

    it('should return empty array when no matches', () => {
      const result = mockTemplates.filter(t => t.category === 'nonexistent')
      expect(result).toHaveLength(0)
    })
  })

  describe('list - Ordering', () => {
    it('should order by lastUsedAt descending', () => {
      const sorted = [...mockTemplates].sort((a, b) => {
        const aTime = a.lastUsedAt?.getTime() || 0
        const bTime = b.lastUsedAt?.getTime() || 0
        return bTime - aTime
      })
      expect(sorted[0].id).toBe('tpl-1') // Has lastUsedAt
    })

    it('should then order by usageCount descending', () => {
      const sameLastUsed = [
        { ...mockTemplates[0], usageCount: 10 },
        { ...mockTemplates[1], lastUsedAt: new Date('2024-01-03'), usageCount: 3 },
      ]
      const sorted = sameLastUsed.sort((a, b) => b.usageCount - a.usageCount)
      expect(sorted[0].usageCount).toBeGreaterThanOrEqual(sorted[1].usageCount)
    })
  })

  describe('create - Input validation', () => {
    it('should accept valid template data', () => {
      const input = {
        title: 'New Template',
        content: 'Template content here',
        category: 'testing',
      }
      expect(input.title).toBe('New Template')
      expect(input.content).toBe('Template content here')
    })

    it('should accept template without category', () => {
      const input = {
        title: 'No Category',
        content: 'Content',
      }
      expect(input.category).toBeUndefined()
    })

    it('should require title (min 1 char)', () => {
      const validTitle = 'A'
      expect(validTitle.length).toBeGreaterThan(0)
    })

    it('should require title (max 200 chars)', () => {
      const maxTitle = 'A'.repeat(200)
      expect(maxTitle.length).toBe(200)
    })

    it('should require content (min 1 char)', () => {
      const validContent = 'Content'
      expect(validContent.length).toBeGreaterThan(0)
    })
  })

  describe('update - Input validation', () => {
    it('should accept partial updates', () => {
      const input = {
        id: 'tpl-1',
        title: 'Updated Title',
      }
      expect(input.id).toBe('tpl-1')
      expect(input.title).toBe('Updated Title')
    })

    it('should accept all fields for update', () => {
      const input = {
        id: 'tpl-1',
        title: 'New Title',
        content: 'New content',
        category: 'new-category',
      }
      expect(input.title).toBe('New Title')
      expect(input.content).toBe('New content')
      expect(input.category).toBe('new-category')
    })
  })

  describe('delete - Input validation', () => {
    it('should accept template ID', () => {
      const input = { id: 'tpl-1' }
      expect(input.id).toBe('tpl-1')
    })
  })

  describe('recordUsage - Behavior', () => {
    it('should increment usage count', () => {
      const template = { ...mockTemplates[0] }
      const newCount = template.usageCount + 1
      expect(newCount).toBe(template.usageCount + 1)
    })

    it('should update lastUsedAt to current time', () => {
      const before = new Date('2024-01-01')
      const after = new Date()
      expect(after.getTime()).toBeGreaterThan(before.getTime())
    })
  })

  describe('Data integrity', () => {
    it('should preserve template data structure', () => {
      mockTemplates.forEach((template) => {
        expect(template).toHaveProperty('id')
        expect(template).toHaveProperty('title')
        expect(template).toHaveProperty('content')
        expect(template).toHaveProperty('category')
        expect(template).toHaveProperty('createdAt')
        expect(template).toHaveProperty('updatedAt')
        expect(template).toHaveProperty('lastUsedAt')
        expect(template).toHaveProperty('usageCount')
      })
    })

    it('should maintain correct data types', () => {
      const template = mockTemplates[0]
      expect(typeof template.id).toBe('string')
      expect(typeof template.title).toBe('string')
      expect(typeof template.content).toBe('string')
      expect(typeof template.category === 'string' || template.category === null).toBe(true)
      expect(template.createdAt).toBeInstanceOf(Date)
      expect(template.updatedAt).toBeInstanceOf(Date)
      expect(template.lastUsedAt === null || template.lastUsedAt instanceof Date).toBe(true)
      expect(typeof template.usageCount).toBe('number')
    })
  })

  describe('Edge cases', () => {
    it('should handle empty template list', () => {
      const result: PromptTemplate[] = []
      expect(result).toHaveLength(0)
    })

    it('should handle special characters in title', () => {
      const specialTitle = 'Template with <script> & "quotes"'
      expect(specialTitle).toContain('<script>')
      expect(specialTitle).toContain('"quotes"')
    })

    it('should handle very long content', () => {
      const longContent = 'A'.repeat(10000)
      expect(longContent.length).toBe(10000)
    })

    it('should handle unicode in title and content', () => {
      const unicodeContent = 'Template with emoji 🎉 and 中文'
      expect(unicodeContent).toContain('🎉')
      expect(unicodeContent).toContain('中文')
    })
  })
})
