export interface User {
  id: string;
  username: string;
  passwordHash: string;
  email: string;
  createdAt: string;
  updatedAt: string;
  settings: UserSettings;
}

export interface UserSettings {
  id: string;
  userId: string;
  country: string;
  currency: string;
  monthlyBudget: number;
  theme: string;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  completed: boolean;
  category: string | null;
  priority: 'low' | 'medium' | 'high';
  amount: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  userId: string;
  content: string;
  role: 'user' | 'assistant';
  createdAt: string;
}

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}
