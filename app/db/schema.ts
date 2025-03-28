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
  // Recurring task fields
  isRecurring: integer("is_recurring", { mode: "boolean" }).notNull().default(false),
  recurringPatternId: text("recurring_pattern_id").references(() => recurringPatterns.id),
  parentTaskId: text("parent_task_id").references(() => tasks.id),
});

// Recurring patterns table
export const recurringPatterns = sqliteTable("recurring_patterns", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
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
  // Recurring task fields
  isRecurring: boolean;
  recurringPatternId: string | null;
  parentTaskId: string | null;
}

// Recurring pattern type
export interface RecurringPattern {
  id: string;
  userId: string;
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  interval: number;
  daysOfWeek: string | null; // Comma-separated days (1-7, where 1 is Monday)
  dayOfMonth: number | null; // 1-31
  monthOfYear: number | null; // 1-12
  endDate: string | null;
  occurrences: number | null;
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
