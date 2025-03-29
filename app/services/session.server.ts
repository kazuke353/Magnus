import { createCookieSessionStorage, redirect } from "@remix-run/node";
import { getUserById } from "~/db/user.server";

export const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "__session",
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secrets: ["s3cr3t"], // In production, use environment variables
    secure: process.env.NODE_ENV === "production",
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
  session.set("lastVerified", new Date().toISOString());
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
