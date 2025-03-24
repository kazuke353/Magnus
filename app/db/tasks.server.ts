import { getDb } from './database.server';
import { Task, tasks } from './schema';
import { v4 as uuidv4 } from 'uuid';
import { eq, and, gte, lte, asc, desc } from 'drizzle-orm';

// Utility type for omitting properties (since `Omit` is built into TypeScript)
type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

export async function createTask(
  userId: string,
  taskData: Omit<Task, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'completed'>
): Promise<Task> {
  const db = getDb();
  const now = new Date().toISOString();
  const id = uuidv4();

  try {
    await db.insert(tasks).values({
      id,
      userId,
      title: taskData.title,
      description: taskData.description || null,
      dueDate: taskData.dueDate || null,
      completed: false, // Default to false as per schema
      category: taskData.category || null,
      amount: taskData.amount || null,
      createdAt: now,
      updatedAt: now
    });

    const newTask = await getTaskById(id);
    if (!newTask) {
      throw new Error('Task not found after creation');
    }
    return newTask;
  } catch (error) {
    console.error("Error in createTask:", error);
    throw error;
  }
}

export async function getTaskById(id: string): Promise<Task> {
  const db = getDb();
  try {
    const result = await db.select()
      .from(tasks)
      .where(eq(tasks.id, id))
      .limit(1);

    if (!result.length) {
      throw new Error(`Task with id ${id} not found`);
    }

    return result[0];
  } catch (error) {
    console.error("getTaskById: Error during database interaction:", error);
    throw error;
  }
}

export async function getUserTasks(userId: string): Promise<Task[]> {
  const db = getDb();
  try {
    const result = await db.select()
      .from(tasks)
      .where(eq(tasks.userId, userId))
      .orderBy(asc(tasks.dueDate), desc(tasks.createdAt));

    return result;
  } catch (error) {
    console.error("getUserTasks: Error during database interaction:", error);
    return []; // Consistent with original behavior
  }
}

export async function getTasksByDateRange(userId: string, startDate: string, endDate: string): Promise<Task[]> {
  const db = getDb();
  try {
    const result = await db.select()
      .from(tasks)
      .where(and(
        eq(tasks.userId, userId),
        gte(tasks.dueDate, startDate),
        lte(tasks.dueDate, endDate)
      ))
      .orderBy(tasks.dueDate.asc());

    return result;
  } catch (error) {
    console.error("getTasksByDateRange: Error during database interaction:", error);
    return []; // Consistent with original behavior
  }
}

export async function updateTask(id: string, taskData: Partial<Task>): Promise<Task> {
  const db = getDb();
  const now = new Date().toISOString();

  try {
    const currentTask = await getTaskById(id);

    const updatedFields = {
      ...taskData,
      updatedAt: now
    };

    await db.update(tasks)
      .set(updatedFields)
      .where(eq(tasks.id, id));

    const updatedTask = await getTaskById(id);
    return updatedTask;
  } catch (error) {
    console.error("updateTask: Error during database interaction:", error);
    throw error;
  }
}

export async function deleteTask(id: string): Promise<void> {
  const db = getDb();
  try {
    await db.delete(tasks)
      .where(eq(tasks.id, id));
  } catch (error) {
    console.error("deleteTask: Error during database interaction:", error);
    throw error;
  }
}