import { getDb } from './database.server';
import bcrypt from 'bcryptjs';
import { User } from './schema';
import { v4 as uuidv4 } from 'uuid';

export function createUser(email: string, password: string, firstName: string = '', lastName: string = ''): User {
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

        const insertUserStmt = db.prepare(
            'INSERT INTO users (id, email, password, firstName, lastName, settings, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        );
        insertUserStmt.run(userId, email, passwordHash, firstName, lastName, JSON.stringify(defaultSettings), now, now);

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
        const user = stmt.get(id) as any | undefined;

        if (!user) return null;

        return {
            id: user.id,
            email: user.email,
            password: user.password,
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            settings: typeof user.settings === 'string' ? JSON.parse(user.settings) : user.settings,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
        } as User;
    } catch (error) {
        console.error("getUserById: Error during database interaction:", error);
        return null;
    }
}

export function getUserByEmail(email: string): User | null {
    const db = getDb();
    try {
        const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
        const user = stmt.get(email) as any | undefined;

        if (!user) {
            return null;
        }

        return {
            id: user.id,
            email: user.email,
            password: user.password,
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            settings: typeof user.settings === 'string' ? JSON.parse(user.settings) : user.settings,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
        } as User;
    } catch (error) {
        console.error("getUserByEmail: Error during database interaction:", error);
        return null;
    }
}

export function verifyLogin(email: string, password: string): User | null {
    console.log(`verifyLogin: Attempting login for email: ${email}`);
    const user = getUserByEmail(email);
    if (!user) {
        console.log(`verifyLogin: User not found for email: ${email}`);
        return null;
    }

    if (!user.password) {
        console.log(`verifyLogin: Password not found for email: ${email}`);
        return null;
    }

    const isValid = bcrypt.compareSync(password, user.password);
    if (!isValid) {
        console.log(`verifyLogin: Invalid password for email: ${email}`);
        return null;
    }

    console.log(`verifyLogin: Login successful for email: ${email}`);
    return user;
}

export function updateUserSettings(
    userId: string,
    settings: Partial<User['settings']>
): User | null {
    const db = getDb();
    const now = new Date().toISOString();

    try {
        // Get current user
        const user = getUserById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        // Update settings
        const updatedSettings = {
            ...user.settings,
            ...settings
        };

        // Update user in database
        const updateStmt = db.prepare(
            'UPDATE users SET settings = ?, updatedAt = ? WHERE id = ?'
        );
        updateStmt.run(JSON.stringify(updatedSettings), now, userId);

        // Return updated user
        return getUserById(userId);
    } catch (error) {
        console.error("updateUserSettings: Error during database interaction:", error);
        return null;
    }
}
