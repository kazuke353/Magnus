// auth.server.ts
import { Authenticator } from "remix-auth";
import { FormStrategy } from "remix-auth-form";
import { sessionStorage, getUser as getSessionUser, setUserSession } from "~/services/session.server"; // sessionStorage now uses env secret and maxAge
import { verifyLogin, getUserById } from "~/db/user.server";
import { User } from "~/db/schema";
import { redirect } from "@remix-run/node";
import { createAuthenticationError } from "~/utils/error-handler";

// Define an interface for what's stored in the session
interface SessionData {
  userId: string;
  lastVerified: string; // ISO timestamp for when the session was last validated
}

// Authenticator now uses the configured sessionStorage with env secret and maxAge
export const authenticator = new Authenticator<SessionData>(sessionStorage);

authenticator.use(
  new FormStrategy(async ({ form }) => {
    const email = form.get("email") as string;
    const password = form.get("password") as string;

    const user = await verifyLogin(email, password);
    if (!user) {
      throw createAuthenticationError("Invalid email or password");
    }

    // Store userId and verification timestamp in the session
    return {
      userId: user.id,
      lastVerified: new Date().toISOString(),
    };
  }),
  "user-pass"
);

// authenticator.isAuthenticated is not a function, since the last updates to remix! This is why we have this function!
export async function isAuthenticated(request: Request): Promise<User | null> {
  try {
    // getSessionUser internally uses getSession which respects maxAge
    const user = await getSessionUser(request);
    return user;
  } catch (error) {
    console.error("Authentication error:", error);
    return null;
  }
}

export async function requireAuthentication(request: Request, failureRedirect: string = "/login") {
  const user = await isAuthenticated(request);

  if (!user) {
    // Get the current path to redirect back after login
    const url = new URL(request.url);
    const currentPath = url.pathname;

    // Only add redirectTo if not already on the login page
    if (currentPath !== failureRedirect) {
      throw redirect(`${failureRedirect}?redirectTo=${encodeURIComponent(currentPath)}`);
    }
    throw redirect(failureRedirect);
  }

  return user;
}

// This function remains the same, but the session it commits now has maxAge
export async function commitSession(request: Request, user: User) {
  return await setUserSession(request, user.id);
}

// This function remains the same, using the configured sessionStorage
export async function logout(request: Request, redirectTo: string = "/login") {
  const session = await sessionStorage.getSession(request.headers.get("Cookie"));
  return redirect(redirectTo, {
    headers: {
      "Set-Cookie": await sessionStorage.destroySession(session),
    },
  });
}
