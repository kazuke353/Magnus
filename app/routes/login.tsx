import { useState } from "react";
import { Form, Link, useActionData, useNavigation, useSearchParams } from "@remix-run/react";
import { ActionFunctionArgs, LoaderFunctionArgs, json, redirect } from "@remix-run/node";
import { authenticator, isAuthenticated } from "~/services/auth.server";
import { verifyLogin, getUserById } from "~/db/user.server";
import Input from "~/components/Input";
import Button from "~/components/Button";
import { setUserSession } from "~/services/session.server";
import { errorResponse } from "~/utils/error-handler";

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const user = await isAuthenticated(request);
    if (user) return redirect("/dashboard");
    return null;
  } catch (error) {
    // If it's a redirect, check for Response-like properties
    if (
      error && 
      typeof error === "object" && 
      "status" in error && 
      "headers" in error &&
      typeof (error as any).status === "number" &&
      (error as any).status === 302
    ) {
      return error;
    }
    return errorResponse(error);
  }
}

export async function action({ request }: ActionFunctionArgs) {
  try {
    console.log("Login action: Attempting authenticator.authenticate...");
    const formData = await request.formData();
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const user = await verifyLogin(email, password);
    if (!user) {
      throw new Error("Invalid email or password");
    }
    console.log("Login action: authenticator.authenticate call completed successfully. User:", user);

    const sessionCookie = await setUserSession(request, user.id);
    
    return redirect("/dashboard", {
      headers: { 
        "Set-Cookie": sessionCookie 
      },
    });
  } catch (error) {
    console.error("Login action: authenticator.authenticate error:", error);
    // If it's a redirect, check for Response-like properties
    if (
      error && 
      typeof error === "object" && 
      "status" in error && 
      "headers" in error &&
      typeof (error as any).status === "number" &&
      (error as any).status === 302
    ) {
      return error;
    }
    return json({ error: (error as Error).message });
  }
}

export default function Login() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/dashboard";
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-gray-100">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Or{" "}
            <Link
              to="/register"
              className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
            >
              create a new account
            </Link>
          </p>
        </div>
        
        <Form method="post" className="mt-8 space-y-6">
          <input type="hidden" name="redirectTo" value={redirectTo} />
          <div className="rounded-md shadow-sm space-y-4">
            <Input
              id="email"
              name="email"
              type="email"
              required
              label="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
            
            <Input
              id="password"
              name="password"
              type="password"
              required
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          
          {actionData?.error && (
            <div className="text-red-600 dark:text-red-400 text-sm">
              {actionData.error}
            </div>
          )}
          
          <div>
            <Button
              type="submit"
              className="w-full"
              isLoading={isSubmitting}
            >
              Sign in
            </Button>
          </div>
        </Form>
      </div>
    </div>
  );
}
