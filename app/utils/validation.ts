import { z } from "zod";

// Existing schemas...
export const UserSchema = z.object({
  email: z.string().min(3, "Email must be at least 3 characters").email("Invalid email address"), // Combined email checks
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const LoginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email address"), // Added email format check
  password: z.string().min(1, "Password is required"),
});

export const SettingsSchema = z.object({
  country: z.string().min(1, "Country is required"),
  currency: z.string().min(1, "Currency is required"),
  monthlyBudget: z.number().min(0, "Monthly budget must be a positive number"),
  theme: z.enum(["light", "dark", "system"])
});

export const TaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(255, "Title too long"), // Added max length
  description: z.string().max(10000, "Description too long").optional().nullable(), // Added max length
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)").optional().nullable(), // Stricter date format
  category: z.string().max(50, "Category too long").optional().nullable(), // Added max length
  priority: z.enum(["low", "medium", "high"]),
  amount: z.number().optional().nullable(),
});

export const ChatMessageSchema = z.object({
  content: z.string().min(1, "Message cannot be empty").max(5000, "Message too long"), // Added max length
});

// --- New Schemas for API Validation ---

// Schema for Watchlist Add action payload
export const WatchlistAddSchema = z.object({
  _action: z.literal("add"),
  instrument: z.object({ // Basic instrument structure check
    ticker: z.string().min(1).max(20), // Example constraints
    name: z.string().min(1).max(100),
    exchange: z.string().max(50).optional(),
    type: z.string().max(50).optional(),
    currencyCode: z.string().max(10).optional(),
    // Add other expected fields if necessary
  }).passthrough(), // Allow other fields from instrument details API
  notes: z.string().max(500, "Notes too long").optional(),
  targetPrice: z.number().positive("Target price must be positive").optional(),
});

// Schema for Watchlist Remove action payload
export const WatchlistRemoveSchema = z.object({
  _action: z.literal("remove"),
  ticker: z.string().min(1).max(20),
});

// Schema for Watchlist Update action payload
export const WatchlistUpdateSchema = z.object({
  _action: z.literal("update"),
  ticker: z.string().min(1).max(20),
  updates: z.object({ // Define possible update fields
    notes: z.string().max(500, "Notes too long").optional(),
    targetPrice: z.number().positive("Target price must be positive").nullable().optional(), // Allow null to remove
    alertEnabled: z.boolean().optional(),
  }).strict(), // Disallow extra fields in updates
});

// Schema for Pie Allocation update payload
export const PieAllocationUpdateSchema = z.object({
  pieName: z.string().min(1).max(100),
  targetAllocation: z.number().min(0, "Allocation cannot be negative").max(100, "Allocation cannot exceed 100"),
});

// Schema for Instrument Search query params
export const InstrumentSearchQuerySchema = z.object({
    query: z.string().min(1, "Search query required").max(100, "Query too long"),
    limit: z.coerce.number().int().positive().max(50).optional().default(10) // Coerce string param to number
});

// Schema for Instrument Detail params
export const InstrumentSymbolParamSchema = z.object({
    symbol: z.string().min(1, "Symbol required").max(20, "Symbol too long") // Validate URL param
});
