import Database from 'better-sqlite3'; // Default export from better-sqlite3
import path from 'path';

let db: Database | null = null; // Note: Type is now from 'better-sqlite3'

export function getDb(): Database { // getDb now returns Database directly (synchronous in better-sqlite3)
    console.log("getDb() called.");

    if (db) {
        console.log("getDb(): Reusing existing database connection.");
        return db;
    }

    const dbPath = path.resolve(process.cwd(), 'app.db');

    try {
        db = new Database(dbPath); // Synchronous database creation in better-sqlite3
        console.log("getDb(): Connected to database using better-sqlite3.");

        // Initialize database schema (moved back schema creation - synchronous in better-sqlite3)
        db.exec(`
            PRAGMA foreign_keys = ON;

            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                passwordHash TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                createdAt TEXT NOT NULL,
                updatedAt TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS user_settings (
                id TEXT PRIMARY KEY,
                userId TEXT NOT NULL,
                country TEXT NOT NULL DEFAULT 'Bulgaria',
                currency TEXT NOT NULL DEFAULT 'BGN',
                monthlyBudget REAL NOT NULL DEFAULT 1000,
                theme TEXT NOT NULL DEFAULT 'light',
                createdAt TEXT NOT NULL,
                updatedAt TEXT NOT NULL,
                FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS tasks (
                id TEXT PRIMARY KEY,
                userId TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT,
                dueDate TEXT,
                completed INTEGER NOT NULL DEFAULT 0,
                category TEXT,
                priority TEXT NOT NULL DEFAULT 'medium',
                amount REAL,
                createdAt TEXT NOT NULL,
                updatedAt TEXT NOT NULL,
                FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS chat_sessions (
                id TEXT PRIMARY KEY,
                userId TEXT NOT NULL,
                title TEXT NOT NULL,
                createdAt TEXT NOT NULL,
                updatedAt TEXT NOT NULL,
                FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS chat_messages (
                id TEXT PRIMARY KEY,
                userId TEXT NOT NULL,
                sessionId TEXT NOT NULL,
                content TEXT NOT NULL,
                role TEXT NOT NULL,
                createdAt TEXT NOT NULL,
                FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (sessionId) REFERENCES chat_sessions(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS user_portfolios (  -- Portfolio table
                id TEXT PRIMARY KEY,
                userId TEXT NOT NULL UNIQUE,  -- 1:1 user-portfolio
                portfolioData TEXT NOT NULL, -- JSON string for portfolio data
                fetchDate TEXT NOT NULL,      -- Timestamp of data fetch
                createdAt TEXT NOT NULL,
                updatedAt TEXT NOT NULL,
                FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
            );
        `);
        console.log("getDb(): Database schema initialized using better-sqlite3.");

        return db;

    } catch (error) {
        console.error("Error creating/initializing database using better-sqlite3:", error);
        throw error; // Re-throw the error to be caught by Remix loader/action
    }
}