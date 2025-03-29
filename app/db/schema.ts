import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

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
  userId: text("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  dueDate: text("due_date"),
  completed: integer("completed", { mode: "boolean" }).notNull().default(false),
  amount: real("amount"),
  category: text("category"),
  priority: text("priority").notNull().default("medium"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// Chat messages table
export const chatMessages = sqliteTable("chat_messages", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: text("created_at").notNull(),
  conversationId: text("conversation_id").notNull(),
});

// Goals table
export const goals = sqliteTable("goals", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
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

export const userPortfolios = sqliteTable("user_portfolios", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  portfolioData: text("portfolio_data", { mode: "json" }).notNull(),
  fetchDate: text("fetch_date").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const trading212Pies = sqliteTable("trading212_pies", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  allocation: integer("allocation").notNull(),
  pieData: text("pie_data").notNull(),
  importDate: text("import_date").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// User type
export interface User {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string | null;
  lastName: string | null;
  createdAt: string;
  updatedAt: string;
  settings: {
    theme?: 'light' | 'dark';
    currency?: string;
    language?: string;
    notifications?: boolean;
    monthlyBudget?: number;
    country?: string;
  };
}

// Task type
export interface Task {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  dueDate: string | undefined;
  completed: boolean;
  amount: number | null;
  category: string | undefined;
  priority: "low" | "medium" | "high";
  createdAt: string;
  updatedAt: string;
}

// Goal type
export interface Goal {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  monthlyContribution: number;
  expectedReturn: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
}
