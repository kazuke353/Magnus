import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  passwordHash: text('password_hash').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  settings: text('settings', { mode: 'json' }).notNull().default('{}'),
});

export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  title: text('title').notNull(),
  description: text('description'),
  dueDate: text('due_date'),
  completed: integer('completed', { mode: 'boolean' }).notNull().default(false),
  priority: text('priority').notNull().default('medium'),
  amount: real('amount'),
  category: text('category'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const chatMessages = sqliteTable('chat_messages', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  role: text('role').notNull(),
  content: text('content').notNull(),
  createdAt: text('created_at').notNull(),
  conversationId: text('conversation_id').notNull(),
});

export const portfolioCache = sqliteTable('portfolio_cache', {
  userId: text('user_id').primaryKey().references(() => users.id),
  data: text('data', { mode: 'json' }).notNull(),
  lastUpdated: text('last_updated').notNull(),
});

export const goals = sqliteTable('goals', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  name: text('name').notNull(),
  targetAmount: real('target_amount').notNull(),
  currentAmount: real('current_amount').notNull(),
  targetDate: text('target_date').notNull(),
  monthlyContribution: real('monthly_contribution').notNull(),
  expectedReturn: real('expected_return').notNull(),
  currency: text('currency').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});
