import { getDb } from './database.server';
import bcrypt from 'bcryptjs';
import { User, UserSettings } from './schema';
import { v4 as uuidv4 } from 'uuid';

export async function createUser(username: string, email: string, password: string): Promise<User> {
  const db = await getDb();
  const passwordHash = await bcrypt.hash(password, 10);
  const now = new Date().toISOString();
  const userId = uuidv4();
  const settingsId = uuidv4();

  await db.run(
    'INSERT INTO users (id, username, passwordHash, email, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)',
    [userId, username, passwordHash, email, now, now]
  );

  await db.run(
    'INSERT INTO user_settings (id, userId, country, currency, monthlyBudget, theme, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [settingsId, userId, 'Bulgaria', 'BGN', 1000, 'light', now, now]
  );

  const user = await getUserById(userId);
  if (!user) {
    throw new Error('User not found after creation');
  }
  return user;
}

export async function getUserById(id: string): Promise<User | null> {
  const db = await getDb();
  const user = await db.get('SELECT * FROM users WHERE id = ?', id);
  
  if (!user) return null;
  
  const settings = await db.get('SELECT * FROM user_settings WHERE userId = ?', id);
  
  return {
    ...user,
    settings: settings || {
      id: '',
      userId: user.id,
      country: 'Bulgaria',
      currency: 'BGN',
      monthlyBudget: 1000,
      theme: 'light',
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }
  };
}

export async function getUserByUsername(username: string): Promise<User | null> {
  const db = await getDb();
  const user = await db.get('SELECT * FROM users WHERE username = ?', username);
  
  if (!user) return null;
  
  return getUserById(user.id);
}

export async function verifyLogin(username: string, password: string): Promise<User | null> {
  console.log(`verifyLogin: Attempting login for username: ${username}`); // **ADD THIS LOG**
  const user = await getUserByUsername(username);
  if (!user) {
    console.log(`verifyLogin: User not found for username: ${username}`); // **ADD THIS LOG**
    return null;
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    console.log(`verifyLogin: Invalid password for username: ${username}`); // **ADD THIS LOG**
    return null;
  }

  console.log(`verifyLogin: Login successful for username: ${username}`); // **ADD THIS LOG**
  return user;
}

export async function updateUserSettings(
  userId: string, 
  settings: Partial<UserSettings>
): Promise<UserSettings> {
  const db = await getDb();
  const now = new Date().toISOString();
  
  const currentSettings = await db.get('SELECT * FROM user_settings WHERE userId = ?', userId);
  
  if (!currentSettings) {
    throw new Error('Settings not found for user');
  }
  
  const updatedSettings = {
    ...currentSettings,
    ...settings,
    updatedAt: now
  };
  
  const { id, userId: _, ...settingsToUpdate } = updatedSettings;
  
  const keys = Object.keys(settingsToUpdate);
  const placeholders = keys.map(() => '?').join(', ');
  const setClause = keys.map(key => `${key} = ?`).join(', ');
  
  await db.run(
    `UPDATE user_settings SET ${setClause} WHERE id = ?`,
    [...Object.values(settingsToUpdate), id]
  );
  
  return updatedSettings as UserSettings;
}
