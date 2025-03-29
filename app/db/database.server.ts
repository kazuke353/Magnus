import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";
import { users, tasks, chatMessages, goals, userPortfolios, trading212Pies } from "./schema";
import { SQLiteColumn, SQLiteTable } from "drizzle-orm/sqlite-core";

// Define a variable to hold the drizzle instance
let drizzleDb: ReturnType<typeof drizzle>;

// Initialize the database and return the drizzle instance
export function getDb() {
  if (!drizzleDb) {
    const dbPath = path.resolve("./data/magnus.db");
    const dataDir = path.dirname(dbPath);
    
    // Create data directory if it doesn't exist
    if (!fs.existsSync(dataDir)) {
      console.log("Creating data directory:", dataDir);
      fs.mkdirSync(dataDir, { recursive: true });
    }

    console.log("Initializing database at:", dbPath);
    const db = new Database(dbPath);
    db.pragma("foreign_keys = ON");

    drizzleDb = drizzle(db, { schema: { users, tasks, chatMessages, goals, userPortfolios, trading212Pies } });
    
    // Initialize database tables
    initializeDatabase(db);
  }
  
  return drizzleDb;
}

// Initialize the database with the required tables
function initializeDatabase(db: Database.Database) {
  const tables = [users, tasks, chatMessages, goals, userPortfolios, trading212Pies];

  // For development only - comment this out in production
  // db.exec("DROP TABLE IF EXISTS users");

  for (const table of tables) {
    try {
      const createTableQuery = generateTableSQL(table);
      db.exec(createTableQuery);
    } catch (error) {
      console.error(`Failed to create table ${table[Symbol.for("drizzle:Name")]}:`, error);
      throw error;
    }
  }
}

// Generate SQL for creating a table
function generateTableSQL(table: SQLiteTable) {
  const tableName = table[Symbol.for("drizzle:Name")];
  const columns = Object.entries(table).filter(([key]) => key !== "sqliteTable") as [string, SQLiteColumn][];

  const columnDefs = columns.map(([_, column]) => {
    // Use the SQL column name from the schema, not the TS property name
    const columnName = column.name; // e.g., "password_hash" instead of "passwordHash"
    let def = `${columnName} ${column.columnType.toUpperCase()}`;

    if (column.primary) def += " PRIMARY KEY";
    if (column.notNull) def += " NOT NULL";
    if (column.default !== undefined) {
      let defaultValue = column.default;
      if (typeof defaultValue === "object") {
        defaultValue = `'${JSON.stringify(defaultValue)}'`;
      } else if (typeof defaultValue === "boolean") {
        defaultValue = defaultValue ? 1 : 0;
      } else if (typeof defaultValue === "string") {
        defaultValue = `'${defaultValue}'`;
      }
      def += ` DEFAULT ${defaultValue}`;
    }
    if (column.references) {
      const refTable = column.references().table[Symbol.for("drizzle:Name")];
      const refColumn = column.references().columns[0].name;
      def += ` REFERENCES ${refTable}(${refColumn}) ON DELETE CASCADE`;
    }
    return def;
  }).join(", ");

  return `CREATE TABLE IF NOT EXISTS ${tableName} (${columnDefs})`;
}

// Initialize the database immediately to ensure it's ready when needed
export const db = getDb();
