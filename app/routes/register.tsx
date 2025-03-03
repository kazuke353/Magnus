import { useState } from "react";
import { Form, Link, useActionData, useNavigation } from "@remix-run/react";
import { ActionFunctionArgs, LoaderFunctionArgs, json, redirect } from "@remix-run/node";
import { authenticator } from "~/services/auth.server";
import { createUser, getUserByUsername } from "~/db/user.server";
import Input from "~/components/Input";
import Button from "~/components/Button";
import { z } from "zod";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await authenticator.isAuthenticated(request);
  if (user) return redirect("/dashboard");
  return null;
}

const RegisterSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const username = formData.get("username") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;
  
  try {
    // Validate form data
    const validatedData = RegisterSchema.parse({
      username,
      email,
      password,
      confirmPassword
    });
    
    // Check if username already exists
    const existingUser = await getUserByUsername(username);
    if (existingUser) {
      return json({ error: "Username already exists" });
    }
    
    // Create user
    await createUser(username, email, password);
    
    // Log in the user
    return await authenticator.authenticate("user-pass", request, {
      successRedirect: "/dashboard",
      context: { formData: new FormData(request.body as any) },
      throwOnError: true,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const fieldErrors = error.flatten().fieldErrors;
      return json({ fieldErrors });
    }
    
    return json({ error: (error as Error).message });
  }
}

export default function Register() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-gray-100">
            Create a new account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Or{" "}
            <Link
              to="/login"
              className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
            >
              sign in to your existing account
            </Link>
          </p>
        </div>
        
        <Form method="post" className="mt-8 space-y-6">
          <div className="rounded-md shadow-sm space-y-4">
            <Input
              id="username"
              name="username"
              type="text"
              required
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              error={actionData?.fieldErrors?.username?.[0] || (actionData?.error?.includes("Username") ? actionData.error : undefined)}
            />
            
            <Input
              id="email"
              name="email"
              type="email"
              required
              label="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              error={actionData?.fieldErrors?.email?.[0]}
            />
            
            <Input
              id="password"
              name="password"
              type="password"
              required
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              error={actionData?.fieldErrors?.password?.[0]}
            />
            
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              label="Confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              error={actionData?.fieldErrors?.confirmPassword?.[0]}
            />
          </div>
          
          {actionData?.error && !actionData.error.includes("Username") && (
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
              Create account
            </Button>
          </div>
        </Form>
      </div>
    </div>
  );
}
