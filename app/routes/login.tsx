import { useState } from "react";
import { Form, Link, useActionData, useNavigation, useSearchParams } from "@remix-run/react";
import { ActionFunctionArgs, LoaderFunctionArgs, json, redirect } from "@remix-run/node";
import { authenticator, isAuthenticated, commitSession } from "~/services/auth.server";
import Input from "~/components/Input";
import Button from "~/components/Button";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await isAuthenticated(request);
  if (user) return redirect("/dashboard");
  return null;
}

export async function action({ request }: ActionFunctionArgs) {
  try {
    console.log("Login action: Attempting authenticator.authenticate...");
    const user = await authenticator.authenticate("user-pass", request);
    console.log("Login action: authenticator.authenticate call completed successfully. User:", user);

    const session = await commitSession(request, user)
    console.log(session)

    // Check if there's a redirectTo parameter
    const formData = await request.formData();
    const redirectTo = formData.get("redirectTo") as string || "/dashboard";

    return redirect(redirectTo, {
      headers: { "Set-Cookie": session },
    });
  } catch (error) {
    console.error("Login action: authenticator.authenticate error:", error);
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
