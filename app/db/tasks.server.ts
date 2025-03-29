import { db } from "./database.server";
import { tasks, Task } from "./schema";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export async function getUserTasks(userId: string): Promise<Task[]> {
  try {
    return await db.select().from(tasks).where(eq(tasks.userId, userId)).orderBy(tasks.createdAt);
  } catch (error) {
    console.error("Error in getUserTasks:", error);
    return [];
  }
}

export async function getTaskById(id: string): Promise<Task | undefined> {
  try {
    const result = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
    return result[0];
  } catch (error) {
    console.error("Error in getTaskById:", error);
    return undefined;
  }
}

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
        updatedAt: nowISOString
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

export async function updateTask(id: string, updates: Partial<Omit<Task, "id" | "userId" | "createdAt" | "updatedAt">>): Promise<Task> {
  try {
    const task = await getTaskById(id);
    
    if (!task) {
      throw new Error(`Task with id ${id} not found`);
    }
    
    const updatedTask = {
      ...task,
      ...updates,
      updatedAt: new Date().toISOString() // Convert to string for SQLite compatibility
    };
    
    await db
      .update(tasks)
      .set(updatedTask)
      .where(eq(tasks.id, id));
    
    return updatedTask;
  } catch (error) {
    console.error("Error in updateTask:", error);
    throw new Error(`Failed to update task: ${error.message}`);
  }
}

export async function deleteTask(id: string): Promise<void> {
  try {
    await db.delete(tasks).where(eq(tasks.id, id));
  } catch (error) {
    console.error("Error in deleteTask:", error);
    throw new Error(`Failed to delete task: ${error.message}`);
  }
}

export async function getTasksByDueDate(userId: string, date: Date): Promise<Task[]> {
  try {
    // Convert date to string format YYYY-MM-DD
    const dateString = date.toISOString().split('T')[0];
    
    // Get all tasks for the user
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
