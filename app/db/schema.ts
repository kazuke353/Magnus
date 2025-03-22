import { v4 as uuidv4 } from 'uuid';

// User schema
export interface User {
  id: string;
  email: string;
  password: string; // Hashed password
  firstName: string;
  lastName: string;
  username?: string; // For backward compatibility
  passwordHash?: string; // For backward compatibility
  settings: UserSettings;
  createdAt: string;
  updatedAt: string;
}

export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  currency: string;
  language: string;
  notifications: boolean;
  monthlyBudget: number;
  country: string;
}

// Task schema
export interface Task {
  id: string;
  userId: string;
  title: string;
  description?: string;
  dueDate?: string;
  completed: boolean;
  amount?: number;
  category?: string;
  createdAt: string;
  updatedAt: string;
}

// Chat schema
export interface ChatMessage {
  id: string;
  userId: string;
  role: 'user' | 'assistant';
  content: string;
  model: string;
  timestamp: string;
}

// Portfolio schema
export interface Portfolio {
  id: string;
  userId: string;
  portfolioData: string; // JSON string
  fetchDate: string;
  createdAt: string;
  updatedAt: string;
}

// Trading 212 Pie schema
export interface Trading212Pie {
  id: string;
  userId: string;
  name: string;
  allocation: number;
  instruments: Trading212Instrument[];
  summary: {
    totalInvested: number;
    totalValue: number;
    totalResult: number;
    dividendsGained: number;
    dividendsCash: number;
    dividendsReinvested: number;
  };
  importDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface Trading212Instrument {
  slice: string;
  name: string;
  investedValue: number;
  value: number;
  result: number;
  ownedQuantity: number;
  dividendsGained: number | null;
  dividendsCash: number | null;
  dividendsReinvested: number | null;
}

// Factory functions to create new objects
export function createUser(data: Partial<User>): User {
  const now = new Date().toISOString();
  return {
    id: data.id || uuidv4(),
    email: data.email || '',
    password: data.password || '',
    firstName: data.firstName || '',
    lastName: data.lastName || '',
    username: data.username || data.firstName || '', // For backward compatibility
    passwordHash: data.passwordHash || data.password || '', // For backward compatibility
    settings: data.settings || {
      theme: 'system',
      currency: 'USD',
      language: 'en',
      notifications: true,
      monthlyBudget: 1000,
      country: 'US'
    },
    createdAt: data.createdAt || now,
    updatedAt: data.updatedAt || now
  };
}

export function createTask(data: Partial<Task>): Task {
  const now = new Date().toISOString();
  return {
    id: data.id || uuidv4(),
    userId: data.userId || '',
    title: data.title || '',
    description: data.description,
    dueDate: data.dueDate,
    completed: data.completed !== undefined ? data.completed : false,
    amount: data.amount,
    category: data.category,
    createdAt: data.createdAt || now,
    updatedAt: data.updatedAt || now
  };
}

export function createChatMessage(data: Partial<ChatMessage>): ChatMessage {
  return {
    id: data.id || uuidv4(),
    userId: data.userId || '',
    role: data.role || 'user',
    content: data.content || '',
    model: data.model || 'gpt-4',
    timestamp: data.timestamp || new Date().toISOString()
  };
}

export function createPortfolio(data: Partial<Portfolio>): Portfolio {
  const now = new Date().toISOString();
  return {
    id: data.id || uuidv4(),
    userId: data.userId || '',
    portfolioData: data.portfolioData || '{}',
    fetchDate: data.fetchDate || now,
    createdAt: data.createdAt || now,
    updatedAt: data.updatedAt || now
  };
}

export function createTrading212Pie(data: Partial<Trading212Pie>): Trading212Pie {
  const now = new Date().toISOString();
  return {
    id: data.id || uuidv4(),
    userId: data.userId || '',
    name: data.name || '',
    allocation: data.allocation || 0,
    instruments: data.instruments || [],
    summary: data.summary || {
      totalInvested: 0,
      totalValue: 0,
      totalResult: 0,
      dividendsGained: 0,
      dividendsCash: 0,
      dividendsReinvested: 0
    },
    importDate: data.importDate || now,
    createdAt: data.createdAt || now,
    updatedAt: data.updatedAt || now
  };
}
