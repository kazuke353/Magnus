import { useLoaderData, useActionData, Form, useNavigation, useSubmit } from "@remix-run/react";
import { LoaderFunctionArgs, ActionFunctionArgs, json, redirect } from "@remix-run/node";
import { requireAuthentication } from "~/services/auth.server";
import { updateUserSettings } from "~/db/user.server";
import Card from "~/components/Card";
import Input from "~/components/Input";
import Button from "~/components/Button";
import { useState, useEffect } from "react";
import { z } from "zod";
import { useTheme } from "~/hooks/useTheme";
import { setTheme as setThemeCookie, Theme } from "~/utils/theme";
import { getSession, commitSession } from "~/services/session.server";
import { formatDate } from "~/utils/formatters";

const SettingsSchema = z.object({
  country: z.string().min(1, "Country is required"),
  currency: z.string().min(1, "Currency is required"),
  monthlyBudget: z.number().min(0, "Monthly budget must be a positive number"),
  theme: z.enum(["light", "dark", "system"])
});

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireAuthentication(request, "/login");
  
  return json({ user });
}

export async function action({ request }: ActionFunctionArgs) {
  const user = await requireAuthentication(request, "/login");

  const formData = await request.formData();
  const country = formData.get("country") as string || '';
  const currency = formData.get("currency") as string || 'USD';
  const monthlyBudgetStr = formData.get("monthlyBudget") as string || '0';
  const themeValue = formData.get("theme");
  const theme = themeValue && typeof themeValue === 'string' ? themeValue : 'light';

  try {
    const monthlyBudget = parseFloat(monthlyBudgetStr);
    const validatedData = SettingsSchema.parse({ country, currency, monthlyBudget, theme });

    await updateUserSettings(user.id, validatedData);

    const cookieHeader = request.headers.get("Cookie");
    const session = await getSession(cookieHeader);

    const headers = new Headers();
    const validTheme: Theme = ['light', 'dark', 'system'].includes(theme) ? theme as Theme : 'light';

    headers.append("Set-Cookie", setThemeCookie(validTheme));
    headers.append("Set-Cookie", await commitSession(session));

    return redirect("/settings", { headers });

  } catch (error) {
    console.error("Settings update error:", error);

    // Check if it's the specific cookie parsing error
    if (error instanceof TypeError && error.message.includes("argument str must be a string")) {
        console.error(">>> Error likely caused by getSession receiving invalid input (null header?).");
        // Provide a more specific error message to the user
        return json({ error: "There was a problem processing your session. Please try logging out and back in." }, { status: 500 });
    }

    if (error instanceof z.ZodError) {
      const fieldErrors = error.flatten().fieldErrors;
      return json({ fieldErrors });
    }

    // General error
    return json({ error: (error as Error).message || "An unknown error occurred" }, { status: 500 });
  }
}

export default function Settings() {
  const { user } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const submit = useSubmit();
  
  // Ensure we have valid default values
  const defaultCountry = user.settings?.country || '';
  const defaultCurrency = user.settings?.currency || 'USD';
  const defaultMonthlyBudget = user.settings?.monthlyBudget?.toString() || '0';
  const defaultTheme = user.settings?.theme || 'light';
  
  const [country, setCountry] = useState(defaultCountry);
  const [currency, setCurrency] = useState(defaultCurrency);
  const [monthlyBudget, setMonthlyBudget] = useState(defaultMonthlyBudget);
  const [selectedTheme, setSelectedTheme] = useState<Theme>(defaultTheme as Theme);
  
  // Use the theme hook to manage theme
  const { updateTheme } = useTheme(defaultTheme as Theme);
  
  // Update theme when selection changes
  useEffect(() => {
    updateTheme(selectedTheme);
  }, [selectedTheme, updateTheme]);
  
  const handleThemeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTheme = e.target.value as Theme;
    setSelectedTheme(newTheme);
    
    // Immediately apply theme change
    updateTheme(newTheme);
  };
  
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const formData = new FormData(e.currentTarget);
    submit(formData, { method: "post" });
  };
  
  // Format the creation date consistently
  const formattedCreationDate = user.createdAt ? formatDate(user.createdAt) : 'N/A';
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
        <p className="text-gray-600 dark:text-gray-400">Manage your account settings and preferences.</p>
      </div>
      
      <Card title="User Settings">
        <Form method="post" className="space-y-6" onSubmit={handleSubmit}>
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
                value={selectedTheme}
                onChange={handleThemeChange}
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
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</h3>
            <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{user.email}</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Account Created</h3>
            <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
              {formattedCreationDate}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
