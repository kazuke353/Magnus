import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";
import { users, tasks, chatMessages, goals, userPortfolios, trading212Pies } from "./schema";
import { SQLiteColumn, SQLiteTable } from "drizzle-orm/sqlite-core";

let db: Database.Database;
let drizzleDb: ReturnType<typeof drizzle>;

function getDb() {
  if (!db) {
    const dbPath = path.resolve("./data/magnus.db");
    const dataDir = path.dirname(dbPath);
    if (!fs.existsSync(dataDir)) {
      console.log("Creating data directory:", dataDir);
      fs.mkdirSync(dataDir, { recursive: true });
    }

    console.log("Initializing database at:", dbPath);
    db = new Database(dbPath);
    db.pragma("foreign_keys = ON");

    drizzleDb = drizzle(db, { schema: { users, tasks, chatMessages, goals, userPortfolios, trading212Pies } });
    initializeDatabase();
  }
  return drizzleDb;
}

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

function initializeDatabase() {
  const tables = [users, tasks, chatMessages, goals, userPortfolios, trading212Pies];

  // Drop existing tables (for development/testing; remove in production)
  db.exec("DROP TABLE IF EXISTS users");

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

export { getDb };