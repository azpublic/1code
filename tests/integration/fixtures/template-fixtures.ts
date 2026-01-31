import type { PromptTemplate } from "src/main/lib/db/schema"

export function createMockTemplate(overrides?: Partial<PromptTemplate>): PromptTemplate {
  return {
    id: `tpl-${Math.random().toString(36).substring(7)}`,
    title: "Test Template",
    content: "Test template content",
    category: "test",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-02"),
    lastUsedAt: null,
    usageCount: 0,
    ...overrides,
  }
}

export function createMockTemplates(count: number): PromptTemplate[] {
  return Array.from({ length: count }, (_, i) =>
    createMockTemplate({
      id: `tpl-${i}`,
      title: `Template ${i}`,
      content: `Content for template ${i}`,
      category: i % 2 === 0 ? "code" : "docs",
    })
  )
}
