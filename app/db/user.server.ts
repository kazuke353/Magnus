import { getDb } from './database.server';
import bcrypt from 'bcryptjs';
import { User, UserSettings, createUser as createUserSchema } from './schema';
import { v4 as uuidv4 } from 'uuid';

export function createUser(username: string, email: string, password: string): User {
    const db = getDb();
    const passwordHash = bcrypt.hashSync(password, 10);
    const now = new Date().toISOString();
    const userId = uuidv4();

    try {
        // Create user with the schema from database.server.ts
        const insertUserStmt = db.prepare(
            'INSERT INTO users (id, email, password, firstName, lastName, settings, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        );
        
        // Create default settings
        const defaultSettings: UserSettings = {
            theme: 'system',
            currency: 'USD',
            language: 'en',
            notifications: true,
            monthlyBudget: 1000,
            country: 'US'
        };
        
        // Insert the user with username as firstName for backward compatibility
        insertUserStmt.run(
            userId, 
            email, 
            passwordHash, 
            username, // Use username as firstName for compatibility
            '', // Empty lastName
            JSON.stringify(defaultSettings), 
            now, 
            now
        );

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
        const user = stmt.get(id) as any;

        if (!user) return null;

        // Parse the settings JSON string
        const settings = user.settings ? JSON.parse(user.settings) : {
            theme: 'system',
            currency: 'USD',
            language: 'en',
            notifications: true,
            monthlyBudget: 1000,
            country: 'US'
        };

        return {
            id: user.id,
            email: user.email,
            password: user.password,
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            username: user.firstName || '', // Use firstName as username for compatibility
            passwordHash: user.password, // For backward compatibility
            settings,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
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
        // Look for username in firstName field since we're using firstName as username
        const stmt = db.prepare('SELECT * FROM users WHERE firstName = ?');
        const user = stmt.get(username) as any;
        console.log("getUserByUsername: Result of user query:", user);

        if (!user) {
            console.log(`getUserByUsername: User not found for username: ${username}`);
            return null;
        }

        // Parse the settings JSON string
        const settings = user.settings ? JSON.parse(user.settings) : {
            theme: 'system',
            currency: 'USD',
            language: 'en',
            notifications: true,
            monthlyBudget: 1000,
            country: 'US'
        };

        return {
            id: user.id,
            email: user.email,
            password: user.password,
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            username: user.firstName || '', // Use firstName as username for compatibility
            passwordHash: user.password, // For backward compatibility
            settings,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
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
    const testStmt = db.prepare('SELECT firstName FROM users'); // Prepare statement for test query
    const test = testStmt.get(); // Execute test query synchronously
    console.log(user, test);

    if (!user.password) {
        console.log(`verifyLogin: Password hash not found for username: ${username}`);
        return null;
    }

    const isValid = bcrypt.compareSync(password, user.password); // Use bcrypt.compareSync for sync
    if (!isValid) {
        console.log(`verifyLogin: Invalid password for username: ${username}`);
        return null;
    }

    console.log(`verifyLogin: Login successful for username: ${username}`);
    return user;
}

export function updateUserSettings(
    userId: string,
    settingsUpdate: Partial<UserSettings>
): UserSettings {
    const db = getDb();
    const now = new Date().toISOString();

    try {
        // Get current user
        const userStmt = db.prepare('SELECT * FROM users WHERE id = ?');
        const user = userStmt.get(userId) as any;

        if (!user) {
            throw new Error('User not found');
        }

        // Parse current settings
        const currentSettings = user.settings ? JSON.parse(user.settings) : {
            theme: 'system',
            currency: 'USD',
            language: 'en',
            notifications: true,
            monthlyBudget: 1000,
            country: 'US'
        };

        // Update settings
        const updatedSettings = {
            ...currentSettings,
            ...settingsUpdate
        };

        // Update user record with new settings
        const updateStmt = db.prepare(
            'UPDATE users SET settings = ?, updatedAt = ? WHERE id = ?'
        );
        updateStmt.run(JSON.stringify(updatedSettings), now, userId);

        return updatedSettings as UserSettings;

    } catch (error) {
        console.error("updateUserSettings: Error during database interaction:", error);
        throw error;
    }
}
