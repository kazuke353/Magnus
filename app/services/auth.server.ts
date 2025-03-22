// auth.server.ts
import { Authenticator } from "remix-auth";
import { FormStrategy } from "remix-auth-form";
import { sessionStorage } from "~/services/session.server";
import { verifyLogin, getUserById } from "~/db/user.server";
import { User } from "~/db/schema";
import { redirect } from "@remix-run/node";

// Define an interface for what's stored in the session
interface SessionData {
  userId: string;
  lastVerified: string; // ISO timestamp for when the session was last validated
}

export const authenticator = new Authenticator<SessionData>(sessionStorage);

authenticator.use(
  new FormStrategy(async ({ form }) => {
    console.log("FormStrategy: Strategy function started...");
    const username = form.get("username") as string;
    const password = form.get("password") as string;

    const user = await verifyLogin(username, password);
    if (!user) {
      throw new Error("Invalid username or password");
    }

    console.log("FormStrategy: Authentication successful in strategy.");
    return {
      userId: user.id,
      lastVerified: new Date().toISOString(),
    };
  }),
  "user-pass"
);

// Check if session is valid and fetch fresh user data from DB
export async function isAuthenticated(request: Request): Promise<User | null> {
  try {
    const session = await sessionStorage.getSession(request.headers.get("Cookie"));
    const userId = session.get("userId");

    if (!userId) {
      console.log("isAuthenticated: No userId found in session.");
      return null;
    }

    // Fetch the user from the database to ensure the session data is still valid
    const user = getUserById(userId);
    if (!user) {
      console.log("isAuthenticated: User not found in database.");
      return null;
    }

    // Optional: Add a time-based validation (e.g., session expires after 24 hours)
    const lastVerified = new Date(session.get("lastVerified"));
    const now = new Date();
    const hoursSinceLastVerified = (now.getTime() - lastVerified.getTime()) / (1000 * 60 * 60);
    if (hoursSinceLastVerified > 24) {
      console.log("isAuthenticated: Session expired.");
      return null; // Force re-authentication
    }

    console.log("isAuthenticated: User verified successfully.");
    return user;
  } catch (error) {
    console.error("Authentication error:", error);
    return null;
  }
}

export async function requireAuthentication(request: Request, failureRedirect: string = "/login") {
  const user = await isAuthenticated(request);
  if (!user) {
    const currentPath = new URL(request.url).pathname;
    if (currentPath !== failureRedirect) {
      throw redirect(`${failureRedirect}?redirectTo=${currentPath}`);
    }
    return null; // Handle case where already on login page
  }
  return user;
}

export async function commitSession(request: Request, user: User) {
  const session = await sessionStorage.getSession(request.headers.get("Cookie"));
  session.set("user", user);
  session.set("userId", user.id)
  session.set("lastVerified", new Date().toISOString())
  return await sessionStorage.commitSession(session);
}

export async function logout(request: Request, redirectTo: string = "/login") {
  const session = await sessionStorage.getSession(request.headers.get("Cookie"));
  return redirect(redirectTo, {
    headers: {
      "Set-Cookie": await sessionStorage.destroySession(session),
    },
  });
}