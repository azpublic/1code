import { z } from "zod"
import { router, publicProcedure } from "../index"
import { getDatabase, tasks } from "../../db"
import { eq, and, desc, asc, inArray, sql } from "drizzle-orm"
import { createChatFromTaskInternal } from "./chats"

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
   * List tasks across multiple projects with optional filters
   */
  listByProjects: publicProcedure
    .input(
      z.object({
        projectIds: z.array(z.string()),
        status: z.enum(["todo", "in-progress", "done"]).optional(),
        priority: z.enum(["low", "medium", "high"]).optional(),
      })
    )
    .query(({ input }) => {
      const db = getDatabase()

      // Return empty array if no projects specified
      if (input.projectIds.length === 0) {
        return []
      }

      // Build conditions
      const conditions = [inArray(tasks.projectId, input.projectIds)]
      if (input.status) {
        conditions.push(eq(tasks.status, input.status))
      }
      if (input.priority) {
        conditions.push(eq(tasks.priority, input.priority))
      }

      // Build and execute query
      return db
        .select()
        .from(tasks)
        .where(and(...conditions))
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
   * Get a task by chat ID
   * Used to find the task associated with a chat
   */
  getByChatId: publicProcedure
    .input(z.object({ chatId: z.string() }))
    .query(({ input }) => {
      const db = getDatabase()
      return db.select().from(tasks).where(eq(tasks.chatId, input.chatId)).get()
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
        projectId: z.string().optional(),
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

  /**
   * Create a chat from a task
   * Creates a new chat with the task context as the initial message
   */
  createChatFromTask: publicProcedure
    .input(
      z.object({
        taskId: z.string(),
        mode: z.enum(["plan", "agent"]).default("plan"),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDatabase()
      const task = db.select().from(tasks).where(eq(tasks.id, input.taskId)).get()
      if (!task) {
        throw new Error("Task not found")
      }

      console.log("[createChatFromTask] Creating chat from task:", task.id, task.title)

      // Create chat with task context
      const chat = await createChatFromTaskInternal(
        db,
        task,
        input.mode,
      )

      console.log("[createChatFromTask] Chat created:", chat.id, "Linking to task:", input.taskId)

      // Link task to chat
      db.update(tasks)
        .set({ chatId: chat.id, status: "in-progress" })
        .where(eq(tasks.id, input.taskId))
        .run()

      console.log("[createChatFromTask] Task linked successfully")
      return chat
    }),

  /**
   * Attach a plan to a task
   * Appends plan content to task description and stores planPath
   */
  attachPlanToTask: publicProcedure
    .input(
      z.object({
        taskId: z.string(),
        planPath: z.string(),
        planContent: z.string(), // Markdown content
      })
    )
    .mutation(async ({ input }) => {
      const db = getDatabase()

      // Get current task
      const task = db.select().from(tasks).where(eq(tasks.id, input.taskId)).get()
      if (!task) {
        throw new Error("Task not found")
      }

      // Append plan to description
      const updatedDescription = task.description
        ? `${task.description}\n\n## Plan\n${input.planContent}`
        : `## Plan\n${input.planContent}`

      // Update task
      const updated = db
        .update(tasks)
        .set({
          planPath: input.planPath,
          description: updatedDescription,
          updatedAt: new Date(),
        })
        .where(eq(tasks.id, input.taskId))
        .returning()
        .get()

      return updated
    }),
})
