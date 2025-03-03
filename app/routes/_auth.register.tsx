import { useState } from "react";
import { json, redirect } from "@remix-run/node";
import { Form, useActionData, useNavigation } from "@remix-run/react";
import type { ActionFunctionArgs } from "@remix-run/node";

import { createUser, createUserSession, getUserByEmail } from "~/models/user.server";
import Button from "~/components/Button";
import Input from "~/components/Input";

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!email || !password || !confirmPassword) {
    return json(
      { error: "All fields are required" },
      { status: 400 }
    );
  }

  if (password !== confirmPassword) {
    return json(
      { error: "Passwords do not match" },
      { status: 400 }
    );
  }

  const existingUser = await getUserByEmail(email);
  if (existingUser) {
    return json(
      { error: "A user with this email already exists" },
      { status: 400 }
    );
  }

  const user = await createUser(email, password);
  const cookie = await createUserSession(user.id, "/dashboard");
  
  return redirect("/dashboard", {
    headers: {
      "Set-Cookie": cookie,
    },
  });
}

export default function Register() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create a new account
          </h2>
        </div>
        <Form method="post" className="mt-8 space-y-6">
          <div className="rounded-md shadow-sm -space-y-px">
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mb-4"
            />
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mb-4"
            />
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          {actionData?.error && (
            <div className="text-red-600 text-sm">{actionData.error}</div>
          )}

          <div>
            <Button
              type="submit"
              variant="primary"
              fullWidth
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating account..." : "Create account"}
            </Button>
          </div>
          
          <div className="text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{" "}
              <a
                href="/login"
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                Sign in
              </a>
            </p>
          </div>
        </Form>
      </div>
    </div>
  );
}
