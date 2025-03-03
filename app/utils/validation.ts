import { z } from "zod";

export const UserSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const LoginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export const SettingsSchema = z.object({
  country: z.string().min(1, "Country is required"),
  currency: z.string().min(1, "Currency is required"),
  monthlyBudget: z.number().min(0, "Monthly budget must be a positive number"),
  theme: z.enum(["light", "dark", "system"])
});

export const TaskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  priority: z.enum(["low", "medium", "high"]),
  amount: z.number().optional().nullable(),
});

export const ChatMessageSchema = z.object({
  content: z.string().min(1, "Message cannot be empty"),
});
