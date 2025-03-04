import { getDb } from './database.server';
import { Task } from './schema';
import { v4 as uuidv4 } from 'uuid';

export async function createTask(
  userId: string,
  taskData: Omit<Task, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'completed'>
): Promise<Task> {
  const db = await getDb();
  const now = new Date().toISOString();
  const id = uuidv4();

  await db.run(
    `INSERT INTO tasks (
      id, userId, title, description, dueDate, completed, category, priority, amount, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
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
    ]
  );

  return getTaskById(id);
}

export async function getTaskById(id: string): Promise<Task> {
  const db = await getDb();
  const task = await db.get('SELECT * FROM tasks WHERE id = ?', id);
  
  if (!task) {
    throw new Error(`Task with id ${id} not found`);
  }
  
  return {
    ...task,
    completed: Boolean(task.completed)
  };
}

export async function getUserTasks(userId: string): Promise<Task[]> {
  const db = await getDb();
  const tasks = await db.all('SELECT * FROM tasks WHERE userId = ? ORDER BY dueDate ASC, createdAt DESC', userId);
  
  return tasks.map(task => ({
    ...task,
    completed: Boolean(task.completed)
  }));
}

export async function getTasksByDateRange(userId: string, startDate: string, endDate: string): Promise<Task[]> {
  const db = await getDb();
  const tasks = await db.all(
    'SELECT * FROM tasks WHERE userId = ? AND dueDate >= ? AND dueDate <= ? ORDER BY dueDate ASC',
    [userId, startDate, endDate]
  );
  
  return tasks.map(task => ({
    ...task,
    completed: Boolean(task.completed)
  }));
}

export async function updateTask(id: string, taskData: Partial<Task>): Promise<Task> {
  const db = await getDb();
  const now = new Date().toISOString();
  
  const currentTask = await getTaskById(id);
  
  const updatedTask = {
    ...currentTask,
    ...taskData,
    updatedAt: now,
    completed: taskData.completed !== undefined ? taskData.completed : currentTask.completed
  };
  
  const { id: taskId, userId, createdAt, ...dataToUpdate } = updatedTask;
  
  const keys = Object.keys(dataToUpdate);
  const placeholders = keys.map(() => '?').join(', ');
  const setClause = keys.map(key => `${key} = ?`).join(', ');
  
  await db.run(
    `UPDATE tasks SET ${setClause} WHERE id = ?`,
    [...Object.values(dataToUpdate), taskId]
  );
  
  return getTaskById(id);
}

export async function deleteTask(id: string): Promise<void> {
  const db = await getDb();
  await db.run('DELETE FROM tasks WHERE id = ?', id);
}
