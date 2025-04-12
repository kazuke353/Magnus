import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

// Users table
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  settings: text("settings", { mode: "json" }).notNull().default("{}"),
});

// Tasks table
export const tasks = sqliteTable("tasks", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text("title").notNull(),
  description: text("description"),
  dueDate: text("due_date"),
  completed: integer("completed", { mode: "boolean" }).notNull().default(false),
  amount: real("amount"),
  category: text("category"),
  priority: text("priority").notNull().default("medium"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  // Recurring task fields
  isRecurring: integer("is_recurring", { mode: "boolean" }).notNull().default(false),
  recurringPatternId: text("recurring_pattern_id").references(() => recurringPatterns.id, { onDelete: 'set null' }),
  parentTaskId: text("parent_task_id").references(() => tasks.id, { onDelete: 'cascade' }),
});

// Recurring patterns table
export const recurringPatterns = sqliteTable("recurring_patterns", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  frequency: text("frequency").notNull(), // daily, weekly, monthly, yearly
  interval: integer("interval").notNull().default(1), // every X days/weeks/months/years
  daysOfWeek: text("days_of_week"), // For weekly: "1,2,3" (Mon,Tue,Wed)
  dayOfMonth: integer("day_of_month"), // For monthly: 1-31
  monthOfYear: integer("month_of_year"), // For yearly: 1-12
  endDate: text("end_date"), // Optional end date
  occurrences: integer("occurrences"), // Optional number of occurrences
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// Chat messages table
export const chatMessages = sqliteTable("chat_messages", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: text("created_at").notNull(),
  conversationId: text("conversation_id").notNull(),
});

// Goals table
export const goals = sqliteTable("goals", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  targetAmount: real("target_amount").notNull(),
  currentAmount: real("current_amount").notNull().default(0),
  targetDate: text("target_date").notNull(),
  monthlyContribution: real("monthly_contribution").notNull(),
  expectedReturn: real("expected_return").notNull(),
  currency: text("currency").notNull().default("$"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull()
});

export const portfolios = sqliteTable('portfolios', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  data: text('data').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
});

export const watchlists = sqliteTable('watchlists', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  data: text('data').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
});

export const portfolioAllocations = sqliteTable('portfolio_allocations', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  data: text('data').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
});

// User API Keys table
export const userApiKeys = sqliteTable("user_api_keys", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  serviceName: text("service_name").notNull(), // e.g., 'openai', 'trading212'
  encryptedKey: text("encrypted_key").notNull(), // Store encrypted key here
  iv: text("iv").notNull(), // Initialization Vector used for encryption
  authTag: text("auth_tag").notNull(), // Authentication Tag for GCM
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  // Unique constraint per user and service
  // SQLite doesn't directly support named unique constraints in drizzle-orm like this
  // We'll rely on application logic or handle potential DB errors for uniqueness
  // unique: ["user_id", "service_name"]
});

// Define TypeScript types for convenience (optional but recommended)
export type User = typeof users.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type RecurringPattern = typeof recurringPatterns.$inferSelect;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type Goal = typeof goals.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type Portfolio = typeof portfolios.$inferSelect;
export type Watchlist = typeof watchlists.$inferSelect;
export type PortfolioAllocation = typeof portfolioAllocations.$inferSelect;
export type UserApiKey = typeof userApiKeys.$inferSelect;
