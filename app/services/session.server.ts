import { createCookieSessionStorage, redirect } from "@remix-run/node";
import { getUserById } from "~/db/user.server";

// Ensure SESSION_SECRET is set in the environment
const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  throw new Error("SESSION_SECRET environment variable is not set!");
}

// Define session expiration time (e.g., 7 days)
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days in seconds

export const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "__session",
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secrets: [sessionSecret], // Use environment variable
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE, // Add session expiration
  },
});

export const { getSession, commitSession, destroySession } = sessionStorage;

// Get the user from the session
export async function getUser(request: Request) {
  const session = await getSession(request.headers.get("Cookie"));
  const userId = session.get("userId");

  if (!userId) {
    return null;
  }

  // Optional: Add session revalidation logic here if needed
  // const lastVerified = session.get("lastVerified");
  // if (!lastVerified || new Date().getTime() - new Date(lastVerified).getTime() > REVALIDATION_INTERVAL) {
  //   // Re-verify user against DB, update lastVerified, commitSession
  // }

  try {
    const user = await getUserById(userId);
    return user;
  } catch (error) {
    console.error("Error getting user from session:", error);
    return null;
  }
}

// Set the user in the session
export async function setUserSession(request: Request, userId: string) {
  const session = await getSession(request.headers.get("Cookie"));
  session.set("userId", userId);
  session.set("lastVerified", new Date().toISOString()); // Add timestamp for potential revalidation
  return await commitSession(session);
}

// Clear the user from the session
export async function clearUserSession(request: Request) {
  const session = await getSession(request.headers.get("Cookie"));
  return redirect("/login", {
    headers: {
      "Set-Cookie": await destroySession(session),
    },
  });
}
