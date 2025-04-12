import { db } from "./database.server";
import { tasks, recurringPatterns, Task, RecurringPattern } from "./schema";
import { eq, and, isNull } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

// getUserTasks already filters by userId, no change needed here.
export async function getUserTasks(userId: string): Promise<Task[]> {
  try {
    return await db.select().from(tasks).where(eq(tasks.userId, userId)).orderBy(tasks.createdAt);
  } catch (error) {
    console.error("Error in getUserTasks:", error);
    return [];
  }
}

// Add userId parameter and filter by it
export async function getTaskById(id: string, userId: string): Promise<Task | undefined> {
  try {
    const result = await db.select()
      .from(tasks)
      .where(and(
        eq(tasks.id, id),
        eq(tasks.userId, userId) // Add ownership check
      ))
      .limit(1);
    return result[0];
  } catch (error) {
    console.error("Error in getTaskById:", error);
    return undefined;
  }
}

// createTask already uses userId from taskData, no change needed here.
export async function createTask(taskData: Omit<Task, "id" | "createdAt" | "updatedAt">): Promise<Task> {
  const id = uuidv4();
  const now = new Date();

  // Convert Date objects to ISO strings for SQLite compatibility
  const newTask: Task = {
    id,
    ...taskData,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString()
  };

  try {
    await db.insert(tasks).values(newTask);
    return newTask;
  } catch (error) {
    console.error("Error in createTask:", error);
    throw new Error(`Failed to create task: ${error.message}`);
  }
}

// createBulkTasks already uses userId, no change needed here.
export async function createBulkTasks(
  userId: string,
  titles: string[],
  defaults: {
    dueDate?: string;
    category?: string;
    priority: "low" | "medium" | "high";
    amount?: number | null;
  }
): Promise<Task[]> {
  const now = new Date();
  const nowISOString = now.toISOString(); // Convert to string for SQLite compatibility
  const createdTasks: Task[] = [];

  try {
    for (const title of titles) {
      if (!title.trim()) continue;

      const id = uuidv4();

      const newTask: Task = {
        id,
        userId,
        title: title.trim(),
        description: "",
        dueDate: defaults.dueDate,
        category: defaults.category,
        priority: defaults.priority,
        amount: defaults.amount || null,
        completed: false,
        createdAt: nowISOString,
        updatedAt: nowISOString,
        isRecurring: false,
        recurringPatternId: null,
        parentTaskId: null
      };

      await db.insert(tasks).values(newTask);
      createdTasks.push(newTask);
    }

    return createdTasks;
  } catch (error) {
    console.error("Error in createBulkTasks:", error);
    throw new Error(`Failed to create bulk tasks: ${error.message}`);
  }
}

// Add userId parameter and filter by it in WHERE clause
export async function updateTask(id: string, userId: string, updates: Partial<Omit<Task, "id" | "userId" | "createdAt" | "updatedAt">>): Promise<Task> {
  try {
    // Fetch task ensuring ownership first
    const task = await getTaskById(id, userId); // Use the updated getTaskById

    if (!task) {
      // Throw a more specific error indicating lack of ownership or existence
      throw new Error(`Task with id ${id} not found or not owned by user ${userId}`);
    }

    const updatedTaskData = {
      ...updates, // Apply updates
      updatedAt: new Date().toISOString() // Update timestamp
    };

    await db
      .update(tasks)
      .set(updatedTaskData)
      .where(and( // Use 'and' for combined condition
        eq(tasks.id, id),
        eq(tasks.userId, userId) // Ensure we only update the task if it belongs to the user
      ));

    // Fetch the updated task to return it (optional, but good practice)
    const result = await getTaskById(id, userId);
    if (!result) {
        // This should ideally not happen if the update succeeded, but handle defensively
        throw new Error(`Failed to retrieve task ${id} after update.`);
    }
    return result;

  } catch (error) {
    console.error("Error in updateTask:", error);
    // Don't expose internal user ID in error message to client if possible
    throw new Error(`Failed to update task: ${error instanceof Error ? error.message : String(error)}`);
  }
}


// Add userId parameter and filter by it in WHERE clause
export async function deleteTask(id: string, userId: string): Promise<void> {
  try {
    const result = await db.delete(tasks)
      .where(and( // Use 'and' for combined condition
        eq(tasks.id, id),
        eq(tasks.userId, userId) // Ensure we only delete the task if it belongs to the user
      ));

    // Optional: Check if any rows were actually deleted if needed
    // Drizzle's delete might return info about affected rows depending on the driver
    // if (result... === 0) { throw new Error(`Task with id ${id} not found or not owned by user ${userId}`); }

  } catch (error) {
    console.error("Error in deleteTask:", error);
    throw new Error(`Failed to delete task: ${error instanceof Error ? error.message : String(error)}`);
  }
}


// getTasksByDueDate already filters by userId via getUserTasks, no change needed here.
export async function getTasksByDueDate(userId: string, date: Date): Promise<Task[]> {
  try {
    // Convert date to string format YYYY-MM-DD
    const dateString = date.toISOString().split('T')[0];

    // Get all tasks for the user (already filtered by userId)
    const userTasks = await getUserTasks(userId);

    // Filter tasks that have the same due date
    return userTasks.filter(task => {
      if (!task.dueDate) return false;
      return task.dueDate.startsWith(dateString);
    });
  } catch (error) {
    console.error("Error in getTasksByDueDate:", error);
    return [];
  }
}

// Recurring Tasks Functions

// createRecurringPattern already uses userId from patternData, no change needed here.
export async function createRecurringPattern(
  patternData: Omit<RecurringPattern, "id" | "createdAt" | "updatedAt">
): Promise<RecurringPattern> {
  const id = uuidv4();
  const now = new Date();

  const newPattern: RecurringPattern = {
    id,
    ...patternData,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString()
  };

  try {
    await db.insert(recurringPatterns).values(newPattern);
    return newPattern;
  } catch (error) {
    console.error("Error in createRecurringPattern:", error);
    throw new Error(`Failed to create recurring pattern: ${error.message}`);
  }
}

// Add userId parameter and filter by it
export async function getRecurringPatternById(id: string, userId: string): Promise<RecurringPattern | undefined> {
  try {
    const result = await db.select()
      .from(recurringPatterns)
      .where(and( // Use 'and'
        eq(recurringPatterns.id, id),
        eq(recurringPatterns.userId, userId) // Add ownership check
      ))
      .limit(1);
    return result[0];
  } catch (error) {
    console.error("Error in getRecurringPatternById:", error);
    return undefined;
  }
}

// Add userId parameter and filter by it in WHERE clause
export async function updateRecurringPattern(
  id: string,
  userId: string, // Add userId
  updates: Partial<Omit<RecurringPattern, "id" | "userId" | "createdAt" | "updatedAt">>
): Promise<RecurringPattern> {
  try {
    // Fetch pattern ensuring ownership first
    const pattern = await getRecurringPatternById(id, userId); // Pass userId

    if (!pattern) {
      throw new Error(`Recurring pattern with id ${id} not found or not owned by user ${userId}`);
    }

    const updatedPatternData = {
      ...updates,
      updatedAt: new Date().toISOString()
    };

    await db
      .update(recurringPatterns)
      .set(updatedPatternData)
      .where(and( // Use 'and'
        eq(recurringPatterns.id, id),
        eq(recurringPatterns.userId, userId) // Add ownership check
      ));

    // Fetch the updated pattern to return it
    const result = await getRecurringPatternById(id, userId);
     if (!result) {
        throw new Error(`Failed to retrieve recurring pattern ${id} after update.`);
    }
    return result;

  } catch (error) {
    console.error("Error in updateRecurringPattern:", error);
    throw new Error(`Failed to update recurring pattern: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Add userId parameter and filter by it in WHERE clauses
export async function deleteRecurringPattern(id: string, userId: string): Promise<void> {
  try {
    // Check ownership before deleting
    const pattern = await getRecurringPatternById(id, userId);
    if (!pattern) {
       // Pattern doesn't exist or doesn't belong to the user, nothing to delete for this user
       console.warn(`Attempted to delete non-existent or unauthorized recurring pattern: id=${id}, userId=${userId}`);
       return; // Or throw an error if preferred
    }

    // First, update all tasks that use this pattern (and belong to the user)
    await db
      .update(tasks)
      .set({ recurringPatternId: null, isRecurring: false })
      .where(and(
        eq(tasks.recurringPatternId, id),
        eq(tasks.userId, userId) // Ensure we only update tasks belonging to the user
      ));

    // Then delete the pattern itself (we already confirmed ownership)
    await db.delete(recurringPatterns)
      .where(and(
          eq(recurringPatterns.id, id),
          eq(recurringPatterns.userId, userId)
      ));
  } catch (error) {
    console.error("Error in deleteRecurringPattern:", error);
    throw new Error(`Failed to delete recurring pattern: ${error instanceof Error ? error.message : String(error)}`);
  }
}


// createRecurringTask already uses userId, no change needed here.
export async function createRecurringTask(
  taskData: Omit<Task, "id" | "createdAt" | "updatedAt" | "isRecurring" | "recurringPatternId" | "parentTaskId">,
  patternData: Omit<RecurringPattern, "id" | "createdAt" | "updatedAt">
): Promise<{ task: Task, pattern: RecurringPattern }> {
  try {
    // Create the recurring pattern (already includes userId)
    const pattern = await createRecurringPattern(patternData);

    // Create the parent task (already includes userId)
    const task = await createTask({
      ...taskData,
      isRecurring: true,
      recurringPatternId: pattern.id,
      parentTaskId: null
    });

    // Generate the first occurrence if needed
    await generateNextOccurrence(task.id, task.userId); // Pass userId

    return { task, pattern };
  } catch (error) {
    console.error("Error in createRecurringTask:", error);
    throw new Error(`Failed to create recurring task: ${error.message}`);
  }
}

// getRecurringTasksForUser already filters by userId, no change needed here.
export async function getRecurringTasksForUser(userId: string): Promise<Task[]> {
  try {
    return await db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, userId),
          eq(tasks.isRecurring, true),
          isNull(tasks.parentTaskId)
        )
      )
      .orderBy(tasks.createdAt);
  } catch (error) {
    console.error("Error in getRecurringTasksForUser:", error);
    return [];
  }
}

// Add userId parameter and filter by it (ensures parent task belongs to user)
export async function getTaskOccurrences(parentTaskId: string, userId: string): Promise<Task[]> {
  try {
    // First, verify the parent task belongs to the user
    const parentTask = await getTaskById(parentTaskId, userId);
    if (!parentTask) {
        console.warn(`Parent task ${parentTaskId} not found or not owned by user ${userId}. Cannot get occurrences.`);
        return [];
    }

    // If parent task is owned, fetch its occurrences
    return await db
      .select()
      .from(tasks)
      .where(and(
        eq(tasks.parentTaskId, parentTaskId),
        eq(tasks.userId, userId) // Double-check occurrences also belong to the user
      ))
      .orderBy(tasks.dueDate);
  } catch (error) {
    console.error("Error in getTaskOccurrences:", error);
    return [];
  }
}

// Add userId parameter and use it for ownership checks
export async function generateNextOccurrence(parentTaskId: string, userId: string): Promise<Task | null> {
  try {
    // Get the parent task, ensuring ownership
    const parentTask = await getTaskById(parentTaskId, userId);
    if (!parentTask || !parentTask.isRecurring || !parentTask.recurringPatternId) {
      console.warn(`Cannot generate next occurrence: Parent task ${parentTaskId} not found, not recurring, or has no pattern ID for user ${userId}.`);
      return null;
    }

    // Get the recurring pattern, ensuring ownership
    const pattern = await getRecurringPatternById(parentTask.recurringPatternId, userId);
    if (!pattern) {
       console.warn(`Cannot generate next occurrence: Recurring pattern ${parentTask.recurringPatternId} not found or not owned by user ${userId}.`);
      return null;
    }

    // Get existing occurrences (already checks ownership)
    const occurrences = await getTaskOccurrences(parentTaskId, userId);

    // Check if we've reached the maximum number of occurrences
    if (pattern.occurrences !== null && occurrences.length >= pattern.occurrences) {
      return null;
    }

    // Calculate the next due date
    const nextDueDate = calculateNextDueDate(
      parentTask,
      pattern,
      occurrences.length > 0 ? occurrences[occurrences.length - 1] : null
    );

    // Check if we've passed the end date
    if (pattern.endDate && nextDueDate > new Date(pattern.endDate)) {
      return null;
    }

    // Create the next occurrence (createTask uses userId from parentTask)
    const newOccurrence = await createTask({
      userId: parentTask.userId, // Use the verified userId
      title: parentTask.title,
      description: parentTask.description,
      dueDate: nextDueDate.toISOString(),
      completed: false,
      amount: parentTask.amount,
      category: parentTask.category,
      priority: parentTask.priority,
      isRecurring: false,
      recurringPatternId: null,
      parentTaskId: parentTaskId
    });

    return newOccurrence;
  } catch (error) {
    console.error("Error in generateNextOccurrence:", error);
    return null;
  }
}


// calculateNextDueDate is a pure function, no userId needed.
function calculateNextDueDate(
  parentTask: Task,
  pattern: RecurringPattern,
  lastOccurrence: Task | null
): Date {
  let baseDate: Date;

  // If there's a last occurrence, use its due date as the base
  if (lastOccurrence && lastOccurrence.dueDate) {
    baseDate = new Date(lastOccurrence.dueDate);
  }
  // Otherwise use the parent task's due date or today
  else if (parentTask.dueDate) {
    baseDate = new Date(parentTask.dueDate);
  } else {
    baseDate = new Date();
  }

  const nextDate = new Date(baseDate);

  switch (pattern.frequency) {
    case "daily":
      nextDate.setDate(nextDate.getDate() + pattern.interval);
      break;

    case "weekly":
      if (pattern.daysOfWeek) {
        // Get days of week as numbers (1-7, where 1 is Monday)
        const daysOfWeek = pattern.daysOfWeek.split(",").map(d => parseInt(d.trim()));

        // Find the next day of week that's after the base date
        let found = false;
        let currentDay = nextDate.getDay(); // 0-6, where 0 is Sunday

        // Convert to 1-7 where 1 is Monday
        currentDay = currentDay === 0 ? 7 : currentDay;

        // Try each day of the week
        for (let i = 0; i < 7; i++) {
          nextDate.setDate(nextDate.getDate() + 1);
          currentDay = currentDay % 7 + 1; // Cycle through days 1-7

          if (daysOfWeek.includes(currentDay)) {
            found = true;
            break;
          }
        }

        // If no valid day found, just add the interval in weeks
        if (!found) {
          nextDate.setDate(nextDate.getDate() + (pattern.interval * 7));
        }
      } else {
        // Simple weekly recurrence
        nextDate.setDate(nextDate.getDate() + (pattern.interval * 7));
      }
      break;

    case "monthly":
      if (pattern.dayOfMonth) {
        // Set to the specified day of the month
        nextDate.setMonth(nextDate.getMonth() + pattern.interval);

        // Adjust the day (handle cases like 31st in months with fewer days)
        const maxDays = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
        nextDate.setDate(Math.min(pattern.dayOfMonth, maxDays));
      } else {
        // Simple monthly recurrence
        nextDate.setMonth(nextDate.getMonth() + pattern.interval);
      }
      break;

    case "yearly":
      if (pattern.monthOfYear && pattern.dayOfMonth) {
        // Set to the specified month and day
        nextDate.setFullYear(nextDate.getFullYear() + pattern.interval);

        // Adjust month (0-11)
        nextDate.setMonth(pattern.monthOfYear - 1);

        // Adjust day (handle February 29 in non-leap years)
        const maxDays = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
        nextDate.setDate(Math.min(pattern.dayOfMonth, maxDays));
      } else {
        // Simple yearly recurrence
        nextDate.setFullYear(nextDate.getFullYear() + pattern.interval);
      }
      break;
  }

  return nextDate;
}

// generateUpcomingOccurrences already filters by userId via getRecurringTasksForUser
export async function generateUpcomingOccurrences(userId: string): Promise<void> {
  try {
    // Get all recurring parent tasks for the user (already filtered)
    const recurringTasks = await getRecurringTasksForUser(userId);

    for (const task of recurringTasks) {
      // Get existing occurrences (now requires userId)
      const occurrences = await getTaskOccurrences(task.id, userId);

      // If there are no occurrences or the last occurrence is in the past or less than 30 days in the future
      if (occurrences.length === 0 ||
          !occurrences[occurrences.length - 1].dueDate ||
          new Date(occurrences[occurrences.length - 1].dueDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)) {

        // Generate the next occurrence (now requires userId)
        await generateNextOccurrence(task.id, userId);
      }
    }
  } catch (error) {
    console.error("Error in generateUpcomingOccurrences:", error);
  }
}
