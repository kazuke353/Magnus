import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";
import {
  users,
  tasks,
  chatMessages,
  goals,
  sessions,
  portfolios,
  watchlists,
  recurringPatterns,
  portfolioAllocations,
  userApiKeys // Import the new schema
} from "./schema";
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
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const db = new Database(dbPath);
    db.pragma("foreign_keys = ON");

    drizzleDb = drizzle(db, {
      schema: {
        users,
        tasks,
        chatMessages,
        goals,
        sessions,
        portfolios,
        watchlists,
        recurringPatterns,
        portfolioAllocations,
        userApiKeys // Add the new table to the schema
      }
    });

    // Initialize database tables
    initializeDatabase(db);
  }

  return drizzleDb;
}

// Initialize the database with the required tables
function initializeDatabase(db: Database.Database) {
  const tables = [
    users,
    tasks,
    recurringPatterns, // Ensure recurringPatterns is created before tasks if tasks references it
    chatMessages,
    goals,
    sessions,
    portfolios,
    watchlists,
    portfolioAllocations,
    userApiKeys // Add the new table here
  ];

  // For development only - comment this out in production
  // db.exec("DROP TABLE IF EXISTS users");
  // db.exec("DROP TABLE IF EXISTS tasks");
  // db.exec("DROP TABLE IF EXISTS recurring_patterns");
  // db.exec("DROP TABLE IF EXISTS user_api_keys"); // Drop if needed during dev

  for (const table of tables) {
    try {
      const createTableQuery = generateTableSQL(table);
      db.exec(createTableQuery);
      console.log(`Table ${table[Symbol.for("drizzle:Name")]} created or already exists.`);

      // Add unique constraint for user_api_keys separately if needed
      if (table === userApiKeys) {
         try {
             // SQLite requires separate statement for multi-column unique constraints
             db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_user_service_unique ON user_api_keys (user_id, service_name);`);
             console.log(`Unique index on user_api_keys (user_id, service_name) created or already exists.`);
         } catch (indexError) {
             console.warn(`Could not create unique index on user_api_keys (may already exist):`, indexError);
         }
      }

    } catch (error) {
      console.error(`Failed to create table ${table[Symbol.for("drizzle:Name")]}:`, error);
      // Decide if you want to throw or just log the error
      // throw error;
    }
  }
}


// Generate SQL for creating a table
function generateTableSQL(table: SQLiteTable): string {
  const tableName = table[Symbol.for("drizzle:Name")];
  const columns = Object.entries(table).filter(([key]) => key !== "sqliteTable") as [string, SQLiteColumn][];
  console.log("Generating SQL for:", tableName);

  const columnDefs = columns.map(([_, column]) => {
    const columnName = column.name;
    let def = `"${columnName}" ${column.columnType.toUpperCase()}`; // Quote column names

    if (column.primary) def += " PRIMARY KEY";
    if (column.notNull) def += " NOT NULL";
    if (column.default !== undefined) {
      let defaultValue = column.default;
      if (typeof defaultValue === "object" && defaultValue !== null) {
        defaultValue = `'${JSON.stringify(defaultValue).replace(/'/g, "''")}'`; // Escape single quotes for JSON string
      } else if (typeof defaultValue === "boolean") {
        defaultValue = defaultValue ? 1 : 0;
      } else if (typeof defaultValue === "string") {
         // Escape single quotes within the string default value
         defaultValue = `'${defaultValue.replace(/'/g, "''")}'`;
      } else if (defaultValue === null) {
         defaultValue = 'NULL'; // Explicitly handle null default
      }
      // Only add DEFAULT if defaultValue is not undefined
      if (defaultValue !== undefined) {
         def += ` DEFAULT ${defaultValue}`;
      }
    }
    // Handle references with ON DELETE CASCADE
    if (column.references) {
      const refTable = column.references().table[Symbol.for("drizzle:Name")];
      const refColumn = column.references().columns[0].name;
      // Ensure referenced table/column names are quoted if they contain special characters or are keywords
      def += ` REFERENCES "${refTable}"("${refColumn}") ON DELETE CASCADE`;
    }
    return def;
  }).join(",\n  "); // Add newline and indentation for readability

  // Add table-level constraints if needed (like multi-column unique constraints)
  // Example (though we handle user_api_keys unique index separately now):
  // let constraints = '';
  // if (tableName === 'user_api_keys') {
  //   constraints = ',\n  UNIQUE ("user_id", "service_name")';
  // }

  return `CREATE TABLE IF NOT EXISTS "${tableName}" (\n  ${columnDefs}\n);`; // Quote table name
}


// Initialize the database immediately to ensure it's ready when needed
export const db = getDb();
