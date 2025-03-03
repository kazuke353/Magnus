import { createCookieSessionStorage } from "@remix-run/node";

// This would be replaced with a real database in production
let users: User[] = [];

export type User = {
  id: string;
  email: string;
  password: string; // In a real app, this would be hashed
  settings: UserSettings;
};

export type UserSettings = {
  country: string;
  currency: string;
  monthlyBudget: number;
};

export async function createUser(email: string, password: string): Promise<User> {
  const user: User = {
    id: Math.random().toString(36).substring(2, 15),
    email,
    password, // In a real app, this would be hashed
    settings: {
      country: "USA",
      currency: "USD",
      monthlyBudget: 1000,
    },
  };
  
  users.push(user);
  return user;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  return users.find(user => user.email === email) || null;
}

export async function getUserById(id: string): Promise<User | null> {
  return users.find(user => user.id === id) || null;
}

export async function updateUserSettings(userId: string, settings: Partial<UserSettings>): Promise<User | null> {
  const userIndex = users.findIndex(user => user.id === userId);
  if (userIndex === -1) return null;
  
  users[userIndex].settings = {
    ...users[userIndex].settings,
    ...settings,
  };
  
  return users[userIndex];
}

// Session management
const sessionSecret = process.env.SESSION_SECRET || "default-secret-for-development";

export const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "portfolio_session",
    secure: process.env.NODE_ENV === "production",
    secrets: [sessionSecret],
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    httpOnly: true,
  },
});

export async function createUserSession(userId: string, redirectTo: string) {
  const session = await sessionStorage.getSession();
  session.set("userId", userId);
  return sessionStorage.commitSession(session);
}

export async function getUserSession(request: Request) {
  return sessionStorage.getSession(request.headers.get("Cookie"));
}

export async function getUserId(request: Request) {
  const session = await getUserSession(request);
  const userId = session.get("userId");
  return userId;
}

export async function requireUserId(request: Request) {
  const userId = await getUserId(request);
  if (!userId) {
    throw new Response("Unauthorized", { status: 401 });
  }
  return userId;
}

export async function getUser(request: Request) {
  const userId = await getUserId(request);
  if (!userId) return null;
  return getUserById(userId);
}

export async function logout(request: Request) {
  const session = await getUserSession(request);
  return sessionStorage.destroySession(session);
}
