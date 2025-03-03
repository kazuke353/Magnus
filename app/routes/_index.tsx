import { redirect } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { authenticator } from "~/services/auth.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await authenticator.isAuthenticated(request);
  
  // If user is logged in, redirect to dashboard
  if (user) {
    return redirect("/dashboard");
  }
  
  // Otherwise, redirect to login
  return redirect("/login");
}
