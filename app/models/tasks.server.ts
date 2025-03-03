// This would be replaced with a real database in production
let tasks: Task[] = [];

export type Task = {
  id: string;
  userId: string;
  title: string;
  description?: string;
  dueDate?: Date;
  completed: boolean;
  category: string;
  financialAmount?: number;
  createdAt: Date;
  updatedAt: Date;
};

export async function createTask(
  userId: string,
  data: {
    title: string;
    description?: string;
    dueDate?: Date;
    category: string;
    financialAmount?: number;
  }
): Promise<Task> {
  const task: Task = {
    id: Math.random().toString(36).substring(2, 15),
    userId,
    title: data.title,
    description: data.description,
    dueDate: data.dueDate,
    completed: false,
    category: data.category,
    financialAmount: data.financialAmount,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  tasks.push(task);
  return task;
}

export async function getUserTasks(userId: string): Promise<Task[]> {
  return tasks.filter(task => task.userId === userId);
}

export async function getTaskById(taskId: string, userId: string): Promise<Task | null> {
  return tasks.find(task => task.id === taskId && task.userId === userId) || null;
}

export async function updateTask(
  taskId: string,
  userId: string,
  data: Partial<Omit<Task, "id" | "userId" | "createdAt" | "updatedAt">>
): Promise<Task | null> {
  const taskIndex = tasks.findIndex(task => task.id === taskId && task.userId === userId);
  if (taskIndex === -1) return null;
  
  tasks[taskIndex] = {
    ...tasks[taskIndex],
    ...data,
    updatedAt: new Date(),
  };
  
  return tasks[taskIndex];
}

export async function deleteTask(taskId: string, userId: string): Promise<boolean> {
  const taskIndex = tasks.findIndex(task => task.id === taskId && task.userId === userId);
  if (taskIndex === -1) return false;
  
  tasks.splice(taskIndex, 1);
  return true;
}

export async function getTasksByDateRange(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<Task[]> {
  return tasks.filter(
    task => 
      task.userId === userId && 
      task.dueDate && 
      task.dueDate >= startDate && 
      task.dueDate <= endDate
  );
}
