// auth.server.ts
import { Authenticator } from "remix-auth";
import { FormStrategy } from "remix-auth-form";
import { sessionStorage } from "~/services/session.server";
import { verifyLogin } from "~/db/user.server";
import { User } from "~/db/schema";
import { redirect } from "@remix-run/node";

export const authenticator = new Authenticator<User>(sessionStorage);

authenticator.use(
  new FormStrategy(async ({ form }) => {
    console.log("FormStrategy: Strategy function started...");
    const username = form.get("username") as string;
    const password = form.get("password") as string;

    const user = await verifyLogin(username, password);
    if (!user) {
      throw new Error("Invalid username or password");
    }

    console.log("FormStrategy: Authentication successful in strategy. About to commit session... ");
    const authenticatedUser = user;

    console.log("FormStrategy: Strategy function completed successfully. Returning user.");
    return authenticatedUser;
  }),
  "user-pass"
);

// Create isAuthenticated function
export async function isAuthenticated(request: Request): Promise<User | null> {
  try {
    const session = await sessionStorage.getSession(request.headers.get("Cookie"));
    const user = session.get("user");
    return user; // Returns user object if authenticated, null otherwise
  } catch (error) {
    console.error("Authentication error:", error);
    return null; // Handle potential errors during authentication process
  }
}

export async function requireAuthentication(request: Request, failureRedirect: string = "/login") {
  const user = await isAuthenticated(request);
  if (!user) {
    const currentPath = new URL(request.url).pathname;
    if (currentPath !== failureRedirect) { // Check if not already on the failureRedirect page
      throw redirect(`${failureRedirect}?redirectTo=${currentPath}`);
    } else {
      // If already on the failureRedirect page, maybe return null or throw a different error?
      // Or simply do nothing and let the component handle the unauthenticated state if needed.
      // For now, let's just return null to indicate unauthenticated state without redirecting again.
      return null; // Or handle differently based on desired behavior when already on login page.
    }
  }
  return user;
}

export async function commitSession(request: Request, user: User) {
  const session = await sessionStorage.getSession(request.headers.get("Cookie"));
  session.set("user", user);
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