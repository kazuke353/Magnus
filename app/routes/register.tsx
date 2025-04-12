import { useState } from "react";
    import { Form, Link, useActionData, useNavigation } from "@remix-run/react";
    import { ActionFunctionArgs, LoaderFunctionArgs, json, redirect } from "@remix-run/node";
    import { isAuthenticated } from "~/services/auth.server";
    import { createUser, getUserByEmail } from "~/db/user.server";
    import Input from "~/components/Input";
    import Button from "~/components/Button";
    import { z } from "zod";
    import { setUserSession } from "~/services/session.server";

    export async function loader({ request }: LoaderFunctionArgs) {
      const user = await isAuthenticated(request);
      if (user) return redirect("/dashboard");
      return null;
    }

    const RegisterSchema = z.object({
      email: z.string().email("Invalid email address"),
      password: z.string().min(8, "Password must be at least 8 characters"),
      confirmPassword: z.string(),
      firstName: z.string().optional(),
      lastName: z.string().optional()
    }).refine(data => data.password === data.confirmPassword, {
      message: "Passwords don't match",
      path: ["confirmPassword"]
    });

    export async function action({ request }: ActionFunctionArgs) {
      const formData = await request.formData();
      const email = formData.get("email") as string;
      const password = formData.get("password") as string;
      const confirmPassword = formData.get("confirmPassword") as string;
      const firstName = formData.get("firstName") as string || '';
      const lastName = formData.get("lastName") as string || '';

      try {
        // 1. Validate form data using Zod
        const validatedData = RegisterSchema.parse({
          email,
          password,
          confirmPassword,
          firstName,
          lastName
        });

        // 2. Check if email already exists
        const existingUser = await getUserByEmail(email);
        if (existingUser) {
          return json({ error: "Email already exists" }, { status: 400 });
        }

        // 3. Create user in database
        const user = await createUser(email, password, firstName, lastName);

        // 4. Set user session
        const sessionCookie = await setUserSession(request, user.id);

        // 5. Redirect to onboarding after successful registration
        return redirect("/onboarding", { // Changed redirect target
          headers: {
            "Set-Cookie": sessionCookie
          },
        });

      } catch (error) {
        if (error instanceof z.ZodError) {
          const fieldErrors = error.flatten().fieldErrors;
          return json({ fieldErrors }, { status: 400 });
        }
        // Generic error handling for registration failures
        return json({ error: "Registration failed: " + (error as Error).message }, { status: 500 });
      }
    }

    export default function Register() {
      const actionData = useActionData<typeof action>();
      const navigation = useNavigation();
      const isSubmitting = navigation.state === "submitting";

      const [email, setEmail] = useState("");
      const [password, setPassword] = useState("");
      const [confirmPassword, setConfirmPassword] = useState("");
      const [firstName, setFirstName] = useState("");
      const [lastName, setLastName] = useState("");

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
                  id="email"
                  name="email"
                  type="email"
                  required
                  label="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  error={actionData?.fieldErrors?.email?.[0] || (actionData?.error?.includes("Email") ? actionData.error : undefined)}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    id="firstName"
                    name="firstName"
                    type="text"
                    label="First name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    autoComplete="given-name"
                    error={actionData?.fieldErrors?.firstName?.[0]}
                  />

                  <Input
                    id="lastName"
                    name="lastName"
                    type="text"
                    label="Last name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    autoComplete="family-name"
                    error={actionData?.fieldErrors?.lastName?.[0]}
                  />
                </div>

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

              {actionData?.error && !actionData.error.includes("Email") && (
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
