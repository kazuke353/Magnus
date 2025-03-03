import { useLoaderData, useActionData, Form, useNavigation } from "@remix-run/react";
import { LoaderFunctionArgs, ActionFunctionArgs, json, redirect } from "@remix-run/node";
import { authenticator } from "~/services/auth.server";
import { updateUserSettings } from "~/db/user.server";
import Card from "~/components/Card";
import Input from "~/components/Input";
import Button from "~/components/Button";
import { useState } from "react";
import { z } from "zod";

const SettingsSchema = z.object({
  country: z.string().min(1, "Country is required"),
  currency: z.string().min(1, "Currency is required"),
  monthlyBudget: z.number().min(0, "Monthly budget must be a positive number"),
  theme: z.enum(["light", "dark", "system"])
});

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await authenticator.isAuthenticated(request, {
    failureRedirect: "/login",
  });
  
  return json({ user });
}

export async function action({ request }: ActionFunctionArgs) {
  const user = await authenticator.isAuthenticated(request, {
    failureRedirect: "/login",
  });
  
  const formData = await request.formData();
  const country = formData.get("country") as string;
  const currency = formData.get("currency") as string;
  const monthlyBudgetStr = formData.get("monthlyBudget") as string;
  const theme = formData.get("theme") as string;
  
  try {
    const monthlyBudget = parseFloat(monthlyBudgetStr);
    
    const validatedData = SettingsSchema.parse({
      country,
      currency,
      monthlyBudget,
      theme
    });
    
    await updateUserSettings(user.id, validatedData);
    
    return redirect("/settings");
  } catch (error) {
    if (error instanceof z.ZodError) {
      const fieldErrors = error.flatten().fieldErrors;
      return json({ fieldErrors });
    }
    
    return json({ error: (error as Error).message });
  }
}

export default function Settings() {
  const { user } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  
  const [country, setCountry] = useState(user.settings.country);
  const [currency, setCurrency] = useState(user.settings.currency);
  const [monthlyBudget, setMonthlyBudget] = useState(user.settings.monthlyBudget.toString());
  const [theme, setTheme] = useState(user.settings.theme || "light");
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
        <p className="text-gray-600 dark:text-gray-400">Manage your account settings and preferences.</p>
      </div>
      
      <Card title="User Settings">
        <Form method="post" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              id="country"
              name="country"
              label="Country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              error={actionData?.fieldErrors?.country?.[0]}
            />
            
            <Input
              id="currency"
              name="currency"
              label="Currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              error={actionData?.fieldErrors?.currency?.[0]}
            />
            
            <Input
              id="monthlyBudget"
              name="monthlyBudget"
              label="Monthly Budget"
              type="number"
              step="0.01"
              min="0"
              value={monthlyBudget}
              onChange={(e) => setMonthlyBudget(e.target.value)}
              error={actionData?.fieldErrors?.monthlyBudget?.[0]}
            />
            
            <div>
              <label htmlFor="theme" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Theme
              </label>
              <select
                id="theme"
                name="theme"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="system">System</option>
              </select>
              {actionData?.fieldErrors?.theme && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {actionData.fieldErrors.theme[0]}
                </p>
              )}
            </div>
          </div>
          
          {actionData?.error && (
            <div className="text-red-600 dark:text-red-400 text-sm">
              {actionData.error}
            </div>
          )}
          
          <div className="flex justify-end">
            <Button
              type="submit"
              isLoading={isSubmitting}
            >
              Save Settings
            </Button>
          </div>
        </Form>
      </Card>
      
      <Card title="Account Information">
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Username</h3>
            <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{user.username}</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</h3>
            <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{user.email}</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Account Created</h3>
            <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
              {new Date(user.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
