import { getDb } from './database.server';
import { goals, Goal } from './schema'; // Import Goal type from schema.ts
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export async function getUserGoals(userId: string): Promise<Goal[]> {
  const db = getDb();
  try {
    const userGoals = await db.select()
      .from(goals)
      .where(eq(goals.userId, userId));
    return userGoals;
  } catch (error) {
    console.error('Error fetching user goals:', error);
    return []; // Consistent with original behavior
  }
}

export async function getGoalById(goalId: string): Promise<Goal | null> {
  const db = getDb();
  try {
    const result = await db.select()
      .from(goals)
      .where(eq(goals.id, goalId))
      .limit(1);

    return result[0] || null;
  } catch (error) {
    console.error('Error fetching goal by ID:', error);
    return null;
  }
}

export async function createGoal(
  userId: string,
  goalData: Omit<Goal, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
): Promise<Goal> {
  const db = getDb();
  const now = new Date().toISOString();
  const id = uuidv4();

  try {
    const newGoal = {
      id,
      userId,
      ...goalData,
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(goals).values(newGoal);

    const createdGoal = await getGoalById(id);
    if (!createdGoal) {
      throw new Error('Goal not found after creation');
    }
    return createdGoal;
  } catch (error) {
    console.error('Error creating goal:', error);
    throw new Error('Failed to create goal');
  }
}

export async function updateGoal(
  goalId: string,
  userId: string,
  goalData: Partial<Omit<Goal, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
): Promise<Goal | null> {
  const db = getDb();
  const now = new Date().toISOString();

  try {
    await db.update(goals)
      .set({
        ...goalData,
        updatedAt: now,
      })
      .where(and(eq(goals.id, goalId), eq(goals.userId, userId)));

    return await getGoalById(goalId);
  } catch (error) {
    console.error('Error updating goal:', error);
    return null;
  }
}

export async function deleteGoal(goalId: string, userId: string): Promise<boolean> {
  const db = getDb();
  try {
    const result = await db.delete(goals)
      .where(and(eq(goals.id, goalId), eq(goals.userId, userId)));

    // Return true if a row was deleted
    return result.length > 0;
  } catch (error) {
    console.error('Error deleting goal:', error);
    return false;
  }
}
