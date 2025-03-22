import { getDb } from './database.server';
import { Task } from './schema';
import { v4 as uuidv4 } from 'uuid';

export function createTask(
  userId: string,
  taskData: Omit<Task, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'completed'>
): Task {
  const db = getDb();
  const now = new Date().toISOString();
  const id = uuidv4();

  try {
    const insertStmt = db.prepare(
      `INSERT INTO tasks (
        id, userId, title, description, dueDate, completed, category, priority, amount, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    insertStmt.run(
      id,
      userId,
      taskData.title,
      taskData.description || null,
      taskData.dueDate || null,
      0,
      taskData.category || null,
      taskData.priority || 'medium',
      taskData.amount || null,
      now,
      now
    );

    return getTaskById(id);

  } catch (error) {
    console.error("Error in createTask:", error);
    throw error;
  }
}

export function getTaskById(id: string): Task {
  const db = getDb();
  try {
    const stmt = db.prepare('SELECT * FROM tasks WHERE id = ?');
    const task = stmt.get(id) as Task | undefined;

    if (!task) {
      throw new Error(`Task with id ${id} not found`);
    }

    return {
      ...task,
      completed: Boolean(task.completed)
    };
  } catch (error) {
    console.error("getTaskById: Error during database interaction:", error);
    throw error; // Or handle differently based on your error handling policy
  }
}

export function getUserTasks(userId: string): Task[] {
  const db = getDb();
  try {
    const stmt = db.prepare('SELECT * FROM tasks WHERE userId = ? ORDER BY dueDate ASC, createdAt DESC');
    const tasks = stmt.all(userId) as Task[];

    return tasks.map(task => ({
      ...task,
      completed: Boolean(task.completed)
    }));
  } catch (error) {
    console.error("getUserTasks: Error during database interaction:", error);
    return []; // Or throw error, depending on how you want to handle failures
  }
}

export function getTasksByDateRange(userId: string, startDate: string, endDate: string): Task[] {
  const db = getDb();
  try {
    const stmt = db.prepare(
      'SELECT * FROM tasks WHERE userId = ? AND dueDate >= ? AND dueDate <= ? ORDER BY dueDate ASC'
    );
    const tasks = stmt.all(userId, startDate, endDate) as Task[];

    return tasks.map(task => ({
      ...task,
      completed: Boolean(task.completed)
    }));
  } catch (error) {
    console.error("getTasksByDateRange: Error during database interaction:", error);
    return []; // Or throw error, depending on your error handling
  }
}

export function updateTask(id: string, taskData: Partial<Task>): Task {
  const db = getDb();
  const now = new Date().toISOString();

  try {
    const currentTask = getTaskById(id);

    const updatedTask = {
      ...currentTask,
      ...taskData,
      updatedAt: now,
      completed: taskData.completed !== undefined ? taskData.completed : currentTask.completed
    };

    const { id: taskId, userId, createdAt, ...dataToUpdate } = updatedTask;

    const keys = Object.keys(dataToUpdate);
    const setClause = keys.map(key => `${key} = ?`).join(', ');

    const updateStmt = db.prepare(
      `UPDATE tasks SET ${setClause} WHERE id = ?`
    );
    updateStmt.run(...Object.values(dataToUpdate), taskId);

    return getTaskById(id);

  } catch (error) {
    console.error("updateTask: Error during database interaction:", error);
    throw error;
  }
}

export function deleteTask(id: string): void {
  const db = getDb();
  try {
    const deleteStmt = db.prepare('DELETE FROM tasks WHERE id = ?');
    deleteStmt.run(id);
  } catch (error) {
    console.error("deleteTask: Error during database interaction:", error);
    throw error; // Or handle error as needed (e.g., log and return void)
  }
}
