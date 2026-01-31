import { z } from "zod"
import { router, publicProcedure } from "../index"
import { getDatabase, promptTemplates } from "../../db"
import { eq, desc, like, sql, or } from "drizzle-orm"

/**
 * tRPC router for prompt template management
 * Provides CRUD operations for reusable prompt templates
 */
export const templatesRouter = router({
  /**
   * List all templates, optionally filtered by category and/or search
   * Returns templates sorted by last used (most recent first) then by usage count
   */
  list: publicProcedure
    .input(
      z.object({
        category: z.string().optional(),
        search: z.string().optional(),
      })
    )
    .query(({ input }) => {
      const db = getDatabase()

      // Build conditions
      const conditions = []
      if (input.category) {
        conditions.push(eq(promptTemplates.category, input.category))
      }
      if (input.search) {
        // Search in both title and content
        const searchPattern = `%${input.search}%`
        conditions.push(
          sql`(${promptTemplates.title} LIKE ${searchPattern} OR ${promptTemplates.content} LIKE ${searchPattern})`
        )
      }

      // Build and execute query
      let query = db.select().from(promptTemplates)

      if (conditions.length > 0) {
        query = query.where(sql`${sql.join(conditions, sql` AND `)}`)
      }

      return query
        .orderBy(
          desc(promptTemplates.lastUsedAt),
          desc(promptTemplates.usageCount),
          desc(promptTemplates.updatedAt)
        )
        .all()
    }),

  /**
   * Get a single template by ID
   */
  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(({ input }) => {
      const db = getDatabase()
      return db.select().from(promptTemplates).where(eq(promptTemplates.id, input.id)).get()
    }),

  /**
   * Create a new template
   */
  create: publicProcedure
    .input(
      z.object({
        title: z.string().min(1).max(200),
        content: z.string().min(1),
        category: z.string().optional(),
      })
    )
    .mutation(({ input }) => {
      const db = getDatabase()
      return db
        .insert(promptTemplates)
        .values({
          title: input.title,
          content: input.content,
          category: input.category,
        })
        .returning()
        .get()
    }),

  /**
   * Update an existing template
   */
  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).max(200).optional(),
        content: z.string().min(1).optional(),
        category: z.string().optional(),
      })
    )
    .mutation(({ input }) => {
      const db = getDatabase()
      const { id, ...updates } = input

      return db
        .update(promptTemplates)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(promptTemplates.id, id))
        .returning()
        .get()
    }),

  /**
   * Delete a template
   */
  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ input }) => {
      const db = getDatabase()
      return db
        .delete(promptTemplates)
        .where(eq(promptTemplates.id, input.id))
        .returning()
        .get()
    }),

  /**
   * Record template usage (increments usage count and updates lastUsedAt)
   * Called when a template is inserted into chat
   */
  recordUsage: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ input }) => {
      const db = getDatabase()

      // Get current usage count
      const template = db.select().from(promptTemplates)
        .where(eq(promptTemplates.id, input.id))
        .get()

      if (!template) {
        throw new Error("Template not found")
      }

      const newUsageCount = (template.usageCount || 0) + 1

      return db
        .update(promptTemplates)
        .set({
          usageCount: newUsageCount,
          lastUsedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(promptTemplates.id, input.id))
        .returning()
        .get()
    }),
})
