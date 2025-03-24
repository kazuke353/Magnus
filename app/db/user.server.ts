import { getDb } from './database.server';
import bcrypt from 'bcryptjs';
import { User } from './schema';
import { v4 as uuidv4 } from 'uuid';
import { users } from './schema';
import { eq } from 'drizzle-orm';

export async function createUser(
  email: string,
  password: string,
  firstName: string = '',
  lastName: string = ''
): Promise<User> {
  const db = getDb();
  const passwordHash = bcrypt.hashSync(password, 10);
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
    return {
      id: user.id,
      email: user.email,
      passwordHash: user.passwordHash,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      settings: user.settings,
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
    return {
      id: user.id,
      email: user.email,
      passwordHash: user.passwordHash,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      settings: user.settings,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  } catch (error) {
    console.error("getUserByEmail: Error during database interaction:", error);
    return null;
  }
}

export async function verifyLogin(email: string, password: string): Promise<User | null> {
  console.log(`verifyLogin: Attempting login for email: ${email}`);
  const user = await getUserByEmail(email);
  if (!user) {
    console.log(`verifyLogin: User not found for email: ${email}`);
    return null;
  }

  if (!user.passwordHash) {
    console.log(`verifyLogin: Password not found for email: ${email}`);
    return null;
  }

  const isValid = bcrypt.compareSync(password, user.passwordHash);
  if (!isValid) {
    console.log(`verifyLogin: Invalid password for email: ${email}`);
    return null;
  }

  console.log(`verifyLogin: Login successful for email: ${email}`);
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
        settings: updatedSettings,
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