import { Database } from 'sqlite';
import { open } from 'sqlite';
import sqlite3 from 'sqlite3';

let db: Database | null = null;

export async function getDb() {
  if (db) return db;

  db = await open({
    filename: 'app.db',
    driver: sqlite3.Database
  });

  // Initialize database with tables
  await db.exec(`
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

    CREATE TABLE IF NOT EXISTS chat_sessions (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      title TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  return db;
}
