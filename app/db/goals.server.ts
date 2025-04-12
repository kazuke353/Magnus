import { getDb } from './database.server';
import { goals, Goal } from './schema'; // Import Goal type from schema.ts
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

// Already filters by userId, OK.
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

// Add userId parameter and filter by it
export async function getGoalById(goalId: string, userId: string): Promise<Goal | null> {
  const db = getDb();
  try {
    const result = await db.select()
      .from(goals)
      .where(and( // Use 'and'
        eq(goals.id, goalId),
        eq(goals.userId, userId) // Add ownership check
      ))
      .limit(1);

    return result[0] || null;
  } catch (error) {
    console.error('Error fetching goal by ID:', error);
    return null;
  }
}

// createGoal already uses userId, OK.
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

    // Fetch the created goal ensuring ownership
    const createdGoal = await getGoalById(id, userId); // Pass userId
    if (!createdGoal) {
      // This should not happen if insert succeeded, but good practice
      throw new Error('Goal not found after creation');
    }
    return createdGoal;
  } catch (error) {
    console.error('Error creating goal:', error);
    throw new Error('Failed to create goal');
  }
}

// updateGoal already filters by userId in WHERE clause, OK.
export async function updateGoal(
  goalId: string,
  userId: string,
  goalData: Partial<Omit<Goal, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
): Promise<Goal | null> {
  const db = getDb();
  const now = new Date().toISOString();

  try {
    // Check ownership before updating
    const existingGoal = await getGoalById(goalId, userId);
    if (!existingGoal) {
        console.warn(`Attempt to update non-existent or unauthorized goal: id=${goalId}, userId=${userId}`);
        return null; // Or throw an error
    }

    await db.update(goals)
      .set({
        ...goalData,
        updatedAt: now,
      })
      .where(and(eq(goals.id, goalId), eq(goals.userId, userId))); // WHERE clause already correct

    // Fetch updated goal ensuring ownership
    return await getGoalById(goalId, userId); // Pass userId
  } catch (error) {
    console.error('Error updating goal:', error);
    return null;
  }
}

// deleteGoal already filters by userId in WHERE clause, OK.
export async function deleteGoal(goalId: string, userId: string): Promise<boolean> {
  const db = getDb();
  try {
    // Check ownership before deleting (optional but safer)
    const existingGoal = await getGoalById(goalId, userId);
     if (!existingGoal) {
        console.warn(`Attempt to delete non-existent or unauthorized goal: id=${goalId}, userId=${userId}`);
        return false; // Indicate deletion didn't happen for this user
    }

    const result = await db.delete(goals)
      .where(and(eq(goals.id, goalId), eq(goals.userId, userId))); // WHERE clause already correct

    // Drizzle's delete for better-sqlite3 might return an object with changes count
    // Adapt this check based on actual return type if needed
    // For now, assume success if no error and ownership check passed
    return true;
  } catch (error) {
    console.error('Error deleting goal:', error);
    return false;
  }
}
