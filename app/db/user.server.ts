import { getDb } from './database.server';
import bcrypt from 'bcryptjs';
import { User } from './schema';
import { v4 as uuidv4 } from 'uuid';
import { users } from './schema';
import { eq } from 'drizzle-orm';

// Increase bcrypt salt rounds for better security
const SALT_ROUNDS = 12;

export async function createUser(
  email: string,
  password: string,
  firstName: string = '',
  lastName: string = ''
): Promise<User> {
  const db = getDb();
  // Use the increased salt rounds
  const passwordHash = bcrypt.hashSync(password, SALT_ROUNDS);
  const now = new Date().toISOString();
  const userId = uuidv4();

  try {
    // Default user settings
    const defaultSettings = {
      theme: 'light',
      currency: 'USD',
      language: 'en',
      notifications: true,
      monthlyBudget: 1000,
      country: 'US'
    };

    await db.insert(users).values({
      id: userId,
      email,
      passwordHash,
      firstName,
      lastName,
      settings: defaultSettings,
      createdAt: now,
      updatedAt: now
    });

    const user = await getUserById(userId);
    if (!user) {
      throw new Error('User not found after creation');
    }
    return user;
  } catch (error) {
    console.error("Error in createUser:", error);
    throw error;
  }
}

export async function getUserById(id: string): Promise<User | null> {
  const db = getDb();
  try {
    const result = await db.select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!result.length) return null;

    const user = result[0];
    // Ensure settings is parsed if stored as JSON string (depends on Drizzle/driver)
    const settings = typeof user.settings === 'string' ? JSON.parse(user.settings) : user.settings;

    return {
      id: user.id,
      email: user.email,
      passwordHash: user.passwordHash,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      settings: settings, // Use parsed settings
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  } catch (error) {
    console.error("getUserById: Error during database interaction:", error);
    return null;
  }
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const db = getDb();
  try {
    const result = await db.select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!result.length) return null;

    const user = result[0];
     // Ensure settings is parsed
    const settings = typeof user.settings === 'string' ? JSON.parse(user.settings) : user.settings;

    return {
      id: user.id,
      email: user.email,
      passwordHash: user.passwordHash,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      settings: settings, // Use parsed settings
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  } catch (error) {
    console.error("getUserByEmail: Error during database interaction:", error);
    return null;
  }
}

export async function verifyLogin(email: string, password: string): Promise<User | null> {
  const user = await getUserByEmail(email);
  if (!user || !user.passwordHash) {
    return null;
  }

  // Use bcrypt.compare for secure comparison
  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    return null;
  }

  return user;
}

export async function updateUserSettings(
  userId: string,
  settings: Partial<User['settings']>
): Promise<User | null> {
  const db = getDb();
  const now = new Date().toISOString();

  try {
    // Get current user
    const user = await getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Update settings
    const updatedSettings = {
      ...user.settings,
      ...settings
    };

    // Update user in database
    await db.update(users)
      .set({
        settings: updatedSettings, // Drizzle handles JSON stringification
        updatedAt: now
      })
      .where(eq(users.id, userId));

    // Return updated user
    return await getUserById(userId);
  } catch (error) {
    console.error("updateUserSettings: Error during database interaction:", error);
    return null;
  }
}
