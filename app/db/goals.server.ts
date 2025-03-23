import { db } from './database.server';
import { goals } from './schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export interface Goal {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  monthlyContribution: number;
  expectedReturn: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export async function getUserGoals(userId: string): Promise<Goal[]> {
  try {
    // Check if db and goals are properly initialized
    if (!db || !goals) {
      console.error('Database or goals schema not properly initialized');
      return [];
    }
    
    const userGoals = await db.select().from(goals).where(eq(goals.userId, userId));
    return userGoals;
  } catch (error) {
    console.error('Error fetching user goals:', error);
    // Return empty array instead of throwing to prevent cascading errors
    return [];
  }
}

export async function getGoalById(goalId: string): Promise<Goal | null> {
  try {
    if (!db || !goals) {
      console.error('Database or goals schema not properly initialized');
      return null;
    }
    
    const [goal] = await db.select().from(goals).where(eq(goals.id, goalId));
    return goal || null;
  } catch (error) {
    console.error('Error fetching goal by ID:', error);
    return null;
  }
}

export async function createGoal(
  userId: string,
  goalData: {
    name: string;
    targetAmount: number;
    currentAmount: number;
    targetDate: string;
    monthlyContribution: number;
    expectedReturn: number;
    currency: string;
  }
): Promise<Goal> {
  try {
    if (!db || !goals) {
      throw new Error('Database or goals schema not properly initialized');
    }
    
    const now = new Date().toISOString();
    const newGoal = {
      id: uuidv4(),
      userId,
      ...goalData,
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(goals).values(newGoal);
    return newGoal;
  } catch (error) {
    console.error('Error creating goal:', error);
    throw new Error('Failed to create goal');
  }
}

export async function updateGoal(
  goalId: string,
  userId: string,
  goalData: Partial<{
    name: string;
    targetAmount: number;
    currentAmount: number;
    targetDate: string;
    monthlyContribution: number;
    expectedReturn: number;
    currency: string;
  }>
): Promise<Goal | null> {
  try {
    if (!db || !goals) {
      throw new Error('Database or goals schema not properly initialized');
    }
    
    const now = new Date().toISOString();
    
    await db.update(goals)
      .set({
        ...goalData,
        updatedAt: now,
      })
      .where(eq(goals.id, goalId) && eq(goals.userId, userId));
    
    return getGoalById(goalId);
  } catch (error) {
    console.error('Error updating goal:', error);
    return null;
  }
}

export async function deleteGoal(goalId: string, userId: string): Promise<boolean> {
  try {
    if (!db || !goals) {
      throw new Error('Database or goals schema not properly initialized');
    }
    
    await db.delete(goals)
      .where(eq(goals.id, goalId) && eq(goals.userId, userId));
    
    return true;
  } catch (error) {
    console.error('Error deleting goal:', error);
    return false;
  }
}
