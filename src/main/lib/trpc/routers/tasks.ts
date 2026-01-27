import { z } from "zod"
import { router, publicProcedure } from "../index"
import { getDatabase, tasks } from "../../db"
import { eq, and, desc, asc } from "drizzle-orm"

/**
 * tRPC router for task management
 * Provides CRUD operations for tasks within projects
 */
export const tasksRouter = router({
  /**
   * List tasks for a project, optionally filtered by status
   */
  list: publicProcedure
    .input(
      z.object({
        projectId: z.string().optional(),
        status: z.enum(["todo", "in-progress", "done"]).optional(),
      })
    )
    .query(({ input }) => {
      const db = getDatabase()

      // Build conditions
      const conditions = []
      if (input.projectId) {
        conditions.push(eq(tasks.projectId, input.projectId))
      }
      if (input.status) {
        conditions.push(eq(tasks.status, input.status))
      }

      // Build query
      let query = db.select().from(tasks)

      if (conditions.length > 0) {
        query = query.where(and(...conditions))
      }

      // Order: incomplete tasks first, then by updated date (newest first)
      return query
        .orderBy(
          asc(tasks.status), // "done" > "in-progress" > "todo" alphabetically, but we want todo first
          desc(tasks.updatedAt)
        )
        .all()
    }),

  /**
   * List all tasks across all projects
   */
  listAll: publicProcedure.query(() => {
    const db = getDatabase()
    return db
      .select()
      .from(tasks)
      .orderBy(desc(tasks.updatedAt))
      .all()
  }),

  /**
   * Get a single task by ID
   */
  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(({ input }) => {
      const db = getDatabase()
      return db.select().from(tasks).where(eq(tasks.id, input.id)).get()
    }),

  /**
   * Create a new task
   */
  create: publicProcedure
    .input(
      z.object({
        projectId: z.string(),
        title: z.string().min(1),
        description: z.string().optional(),
        priority: z.enum(["low", "medium", "high"]).optional(),
      })
    )
    .mutation(({ input }) => {
      const db = getDatabase()
      return db
        .insert(tasks)
        .values({
          projectId: input.projectId,
          title: input.title,
          description: input.description,
          priority: input.priority ?? "medium",
        })
        .returning()
        .get()
    }),

  /**
   * Update an existing task
   */
  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        status: z.enum(["todo", "in-progress", "done"]).optional(),
        priority: z.enum(["low", "medium", "high"]).optional(),
        planPath: z.string().optional(),
      })
    )
    .mutation(({ input }) => {
      const db = getDatabase()
      const { id, ...updates } = input

      // Build update object
      const updateData: Record<string, any> = {
        ...updates,
        updatedAt: new Date(),
      }

      // Set completedAt when status changes to "done"
      if (updates.status === "done") {
        updateData.completedAt = new Date()
      }

      return db
        .update(tasks)
        .set(updateData)
        .where(eq(tasks.id, id))
        .returning()
        .get()
    }),

  /**
   * Delete a task
   */
  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ input }) => {
      const db = getDatabase()
      return db
        .delete(tasks)
        .where(eq(tasks.id, input.id))
        .returning()
        .get()
    }),
})
