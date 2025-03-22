import { getDb } from './database.server';
import bcrypt from 'bcryptjs';
import { User, UserSettings } from './schema';
import { v4 as uuidv4 } from 'uuid';

export function createUser(username: string, email: string, password: string): User {
    const db = getDb();
    const passwordHash = bcrypt.hashSync(password, 10);
    const now = new Date().toISOString();
    const userId = uuidv4();
    const settingsId = uuidv4();

    try {
        const insertUserStmt = db.prepare(
            'INSERT INTO users (id, username, passwordHash, email, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)'
        );
        insertUserStmt.run(userId, username, passwordHash, email, now, now);

        const insertSettingsStmt = db.prepare(
            'INSERT INTO user_settings (id, userId, country, currency, monthlyBudget, theme, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        );
        insertSettingsStmt.run(settingsId, userId, 'Bulgaria', 'BGN', 1000, 'light', now, now);

        const user = getUserById(userId);
        if (!user) {
            throw new Error('User not found after creation');
        }
        return user;

    } catch (error) {
        console.error("Error in createUser:", error);
        throw error;
    }
}

export function getUserById(id: string): User | null {
    const db = getDb();
    try {
        const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
        const user = stmt.get(id) as User | undefined;

        if (!user) return null;

        const settingsStmt = db.prepare('SELECT * FROM user_settings WHERE userId = ?');
        const settings = settingsStmt.get(id) as UserSettings | undefined;

        return {
            id: user.id,
            username: user.username,
            passwordHash: user.passwordHash,
            email: user.email,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
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
        } as User;
    } catch (error) {
        console.error("getUserById: Error during database interaction:", error);
        return null;
    }
}

export function getUserByUsername(username: string): User | null {
    const db = getDb();
    console.log("getUserByUsername: Database object:", db);

    try {
        const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
        const user = stmt.get(username) as User | undefined;
        console.log("getUserByUsername: Result of user query:", user);

        if (!user) {
            console.log(`getUserByUsername: User not found for username: ${username}`);
            return null;
        }

        const settingsStmt = db.prepare('SELECT * FROM user_settings WHERE userId = ?');
        const settings = settingsStmt.get(user.id) as UserSettings | undefined;

        return {
            id: user.id,
            username: user.username,
            passwordHash: user.passwordHash,
            email: user.email,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
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
        } as User;

    } catch (error) {
        console.error("getUserByUsername: Error during database interaction:", error);
        return null;
    }
}

export function verifyLogin(username: string, password: string): User | null {
    console.log(`verifyLogin: Attempting login for username: ${username}`);
    const user = getUserByUsername(username);
    if (!user) {
        console.log(`verifyLogin: User not found for username: ${username}`);
        return null;
    }

    const db = getDb(); // Get db connection - although not directly used in this sync version for query test.
    const testStmt = db.prepare('SELECT username FROM users'); // Prepare statement for test query
    const test = testStmt.get(); // Execute test query synchronously
    console.log(user, test);

    if (!user.passwordHash) {
        console.log(`verifyLogin: Password hash not found for username: ${username}`);
        return null;
    }

    const isValid = bcrypt.compareSync(password, user.passwordHash); // Use bcrypt.compareSync for sync
    if (!isValid) {
        console.log(`verifyLogin: Invalid password for username: ${username}`);
        return null;
    }

    console.log(`verifyLogin: Login successful for username: ${username}`);
    return user;
}

export function updateUserSettings(
    userId: string,
    settings: Partial<UserSettings>
): UserSettings {
    const db = getDb();
    const now = new Date().toISOString();

    try {
        const currentSettingsStmt = db.prepare('SELECT * FROM user_settings WHERE userId = ?');
        const currentSettings = currentSettingsStmt.get(userId) as UserSettings;

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
        const setClause = keys.map(key => `${key} = ?`).join(', ');

        const updateStmt = db.prepare(
            `UPDATE user_settings SET ${setClause} WHERE id = ?`
        );
        updateStmt.run(...Object.values(settingsToUpdate), id);

        return updatedSettings as UserSettings;

    } catch (error) {
        console.error("updateUserSettings: Error during database interaction:", error);
        throw error; // Re-throw error to be caught by action/loader
    }
}
