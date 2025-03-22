import { Authenticator } from "remix-auth";
import { FormStrategy } from "remix-auth-form";
import { createCookieSessionStorage, redirect } from "@remix-run/node";
import { verifyLogin, getUserById } from "~/db/user.server";
import { User } from "~/db/schema";

// Create session storage
export const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "__session",
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secrets: ["s3cr3t"], // Replace with actual secret in production
    secure: process.env.NODE_ENV === "production",
  },
});

// Create authenticator
export const authenticator = new Authenticator<User>(sessionStorage);

// Add form strategy
authenticator.use(
  new FormStrategy(async ({ form }) => {
    const username = form.get("username") as string;
    const password = form.get("password") as string;

    if (!username || !password) {
      throw new Error("Username and password are required");
    }

    const user = await verifyLogin(username, password);
    if (!user) {
      throw new Error("Invalid username or password");
    }

    return user;
  }),
  "user-pass"
);

// Helper to check if user is authenticated
export async function isAuthenticated(request: Request) {
  try {
    return await authenticator.isAuthenticated(request);
  } catch (error) {
    console.error("Error in isAuthenticated:", error);
    return null;
  }
}

// Helper to require authentication
export async function requireAuthentication(request: Request, redirectTo: string = "/login") {
  const user = await isAuthenticated(request);
  if (!user) {
    throw redirect(redirectTo);
  }
  return user;
}

// Helper to commit session with user
export async function commitSession(request: Request, user: User) {
  const session = await sessionStorage.getSession(request.headers.get("Cookie"));
  session.set(authenticator.sessionKey, user);
  return sessionStorage.commitSession(session);
}
