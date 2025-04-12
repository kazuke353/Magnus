import { useLoaderData, useActionData, Form, useNavigation, useSubmit } from "@remix-run/react";
import { LoaderFunctionArgs, ActionFunctionArgs, json, redirect } from "@remix-run/node";
import { requireAuthentication } from "~/services/auth.server";
import { updateUserSettings, getUserById } from "~/db/user.server"; // Added getUserById
import { listUserApiKeyServices, saveUserApiKey, deleteUserApiKey } from "~/db/apiKeys.server"; // Import API key functions
import Card from "~/components/Card";
import Input from "~/components/Input";
import Select from "~/components/Select"; // Import Select component
import type { SelectOption } from "~/components/Select"; // Import SelectOption type
import Button from "~/components/Button";
import { useState, useEffect } from "react";
import { z } from "zod";
import { useTheme } from "~/hooks/useTheme";
import { setTheme as setThemeCookie, Theme } from "~/utils/theme";
import { getSession, commitSession } from "~/services/session.server";
import { formatDate } from "~/utils/formatters";
import { FiTrash2, FiPlus, FiKey, FiEyeOff, FiEye } from "react-icons/fi"; // Added icons
import { showToast } from "~/components/ToastContainer"; // Import toast

// Define the list of supported services
const SUPPORTED_API_SERVICES: SelectOption[] = [
  { value: "", label: "Select a service..." }, // Add a placeholder
  { value: "openai", label: "OpenAI" },
  { value: "trading212", label: "Trading 212" },
  // Add more services here as needed
];

const SettingsSchema = z.object({
  country: z.string().min(1, "Country is required"),
  currency: z.string().min(1, "Currency is required"),
  monthlyBudget: z.number().min(0, "Monthly budget must be a positive number"),
  theme: z.enum(["light", "dark", "system"])
});

// Zod schema for API Key form - Ensure serviceName is one of the supported values
const ApiKeySchema = z.object({
  serviceName: z.enum(SUPPORTED_API_SERVICES.filter(s => s.value).map(s => s.value) as [string, ...string[]], {
      errorMap: () => ({ message: "Please select a valid service." })
  }),
  apiKey: z.string().min(10, "API Key seems too short"), // Basic length check
});


export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireAuthentication(request);
  console.log(`[Settings Loader] Authenticated User ID: ${user.id}`); // DEBUG LOG
  const apiKeyServices = await listUserApiKeyServices(user.id);
  const fullUser = await getUserById(user.id);

  return json({ user: fullUser || user, apiKeyServices });
}

export async function action({ request }: ActionFunctionArgs) {
  const user = await requireAuthentication(request);
  console.log(`[Settings Action] Authenticated User ID: ${user.id}`); // DEBUG LOG
  const formData = await request.formData();
  const actionType = formData.get("_action") as string;
  console.log(`[Settings Action] Action Type: ${actionType}, User ID: ${user.id}`); // DEBUG LOG

  // --- Handle API Key Actions ---
  if (actionType === "save_api_key") {
    const serviceName = formData.get("serviceName") as string;
    const apiKey = formData.get("apiKey") as string;
    console.log(`[Settings Action - save_api_key] Saving for User ID: ${user.id}, Service: ${serviceName}`); // DEBUG LOG

    try {
      // Validate using the updated schema
      ApiKeySchema.parse({ serviceName, apiKey });
      await saveUserApiKey(user.id, serviceName, apiKey); // Pass the authenticated user's ID
      showToast({ type: "success", message: `API Key for ${serviceName} saved successfully.` });
      return json({ success: true, serviceName });
    } catch (error) {
      console.error("Save API Key Error:", error);
       if (error instanceof z.ZodError) {
         const fieldErrors = error.flatten().fieldErrors;
         // Use formErrors for general schema errors like enum validation
         const formErrors = error.flatten().formErrors;
         return json({ apiKeyError: true, fieldErrors, formErrors }, { status: 400 });
       }
      return json({ apiKeyError: true, error: (error as Error).message || "Failed to save API key." }, { status: 500 });
    }
  }

  if (actionType === "delete_api_key") {
    const serviceName = formData.get("serviceName") as string;
    console.log(`[Settings Action - delete_api_key] Deleting for User ID: ${user.id}, Service: ${serviceName}`); // DEBUG LOG
    if (!serviceName) {
      return json({ apiKeyError: true, error: "Service name is required to delete." }, { status: 400 });
    }
    try {
      const success = await deleteUserApiKey(user.id, serviceName); // Pass the authenticated user's ID
      if (!success) {
        throw new Error("Failed to delete API key from database.");
      }
      showToast({ type: "success", message: `API Key for ${serviceName} deleted.` });
      return json({ success: true, deletedServiceName: serviceName });
    } catch (error) {
      console.error("Delete API Key Error:", error);
      return json({ apiKeyError: true, error: (error as Error).message || "Failed to delete API key." }, { status: 500 });
    }
  }

  // --- Handle User Settings Action ---
  if (actionType === "update_settings") {
     console.log(`[Settings Action - update_settings] Updating for User ID: ${user.id}`); // DEBUG LOG
    const country = formData.get("country") as string || '';
    const currency = formData.get("currency") as string || 'USD';
    const monthlyBudgetStr = formData.get("monthlyBudget") as string || '0';
    const themeValue = formData.get("theme");
    const theme = themeValue && typeof themeValue === 'string' ? themeValue : 'light';

    try {
      const monthlyBudget = parseFloat(monthlyBudgetStr);
      const validatedData = SettingsSchema.parse({ country, currency, monthlyBudget, theme });

      await updateUserSettings(user.id, validatedData); // Pass the authenticated user's ID

      const cookieHeader = request.headers.get("Cookie");
      const session = await getSession(cookieHeader);

      const headers = new Headers();
      const validTheme: Theme = ['light', 'dark', 'system'].includes(theme) ? theme as Theme : 'light';

      headers.append("Set-Cookie", setThemeCookie(validTheme));
      headers.append("Set-Cookie", await commitSession(session));

      showToast({ type: "success", message: "Settings updated successfully." });
      return redirect("/settings", { headers });

    } catch (error) {
      console.error("Settings update error:", error);
      if (error instanceof TypeError && error.message.includes("argument str must be a string")) {
          return json({ settingsError: true, error: "Session error. Please try logging out and back in." }, { status: 500 });
      }
      if (error instanceof z.ZodError) {
        const fieldErrors = error.flatten().fieldErrors;
        return json({ settingsError: true, fieldErrors });
      }
      return json({ settingsError: true, error: (error as Error).message || "An unknown error occurred" }, { status: 500 });
    }
  }

  // Fallback for unknown action
  return json({ error: "Invalid action type" }, { status: 400 });
}

export default function Settings() {
  const { user, apiKeyServices: initialApiKeyServices } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const submit = useSubmit();

  // State for user settings form
  const defaultCountry = user?.settings?.country || '';
  const defaultCurrency = user?.settings?.currency || 'USD';
  const defaultMonthlyBudget = user?.settings?.monthlyBudget?.toString() || '0';
  const defaultTheme = user?.settings?.theme || 'light';

  const [country, setCountry] = useState(defaultCountry);
  const [currency, setCurrency] = useState(defaultCurrency);
  const [monthlyBudget, setMonthlyBudget] = useState(defaultMonthlyBudget);
  const [selectedTheme, setSelectedTheme] = useState<Theme>(defaultTheme as Theme);

  // State for API Key form
  const [apiKeyServices, setApiKeyServices] = useState<string[]>(initialApiKeyServices || []);
  const [newServiceName, setNewServiceName] = useState(""); // Default to empty string for placeholder
  const [newApiKey, setNewApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);

  const { updateTheme } = useTheme(defaultTheme as Theme);

  useEffect(() => {
    updateTheme(selectedTheme);
  }, [selectedTheme, updateTheme]);

  useEffect(() => {
    if (actionData?.success && actionData.serviceName && !apiKeyServices.includes(actionData.serviceName)) {
      setApiKeyServices(prev => [...prev, actionData.serviceName].sort());
      setNewServiceName(""); // Reset dropdown on success
      setNewApiKey("");
      setShowApiKey(false);
    }
    if (actionData?.success && actionData.deletedServiceName) {
      setApiKeyServices(prev => prev.filter(name => name !== actionData.deletedServiceName));
    }
  }, [actionData]);


  const handleThemeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTheme = e.target.value as Theme;
    setSelectedTheme(newTheme);
    updateTheme(newTheme);
  };

  const handleSettingsSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.append("_action", "update_settings");
    submit(formData, { method: "post" });
  };

  const handleApiKeySubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.append("_action", "save_api_key");
    submit(formData, { method: "post" });
  };

  const handleDeleteApiKey = (serviceName: string) => {
    if (confirm(`Are you sure you want to delete the API key for ${serviceName}?`)) {
      const formData = new FormData();
      formData.append("_action", "delete_api_key");
      formData.append("serviceName", serviceName);
      submit(formData, { method: "post" });
    }
  };

  const isSettingsSubmitting = navigation.state === "submitting" && navigation.formData?.get("_action") === "update_settings";
  const isApiKeySubmitting = navigation.state === "submitting" && (navigation.formData?.get("_action") === "save_api_key" || navigation.formData?.get("_action") === "delete_api_key");

  const formattedCreationDate = user?.createdAt ? formatDate(user.createdAt) : 'N/A';

  const settingsFieldErrors = actionData?.settingsError ? actionData.fieldErrors : null;
  const apiKeyFieldErrors = actionData?.apiKeyError ? actionData.fieldErrors : null;
  const apiKeyFormErrors = actionData?.apiKeyError ? actionData.formErrors : null; // Get general form errors
  const settingsGeneralError = actionData?.settingsError ? actionData.error : null;
  const apiKeyGeneralError = actionData?.apiKeyError ? actionData.error : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
        <p className="text-gray-600 dark:text-gray-400">Manage your account settings, preferences, and API keys.</p>
      </div>

      {/* User Settings Card */}
      <Card title="User Settings">
        <Form method="post" className="space-y-6" onSubmit={handleSettingsSubmit}>
          <input type="hidden" name="_action" value="update_settings" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              id="country"
              name="country"
              label="Country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              error={settingsFieldErrors?.country?.[0]}
            />
            <Input
              id="currency"
              name="currency"
              label="Currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              error={settingsFieldErrors?.currency?.[0]}
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
              error={settingsFieldErrors?.monthlyBudget?.[0]}
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
              {settingsFieldErrors?.theme && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {settingsFieldErrors.theme[0]}
                </p>
              )}
            </div>
          </div>
          {settingsGeneralError && (
            <div className="text-red-600 dark:text-red-400 text-sm">
              {settingsGeneralError}
            </div>
          )}
          <div className="flex justify-end">
            <Button type="submit" isLoading={isSettingsSubmitting}>
              Save Settings
            </Button>
          </div>
        </Form>
      </Card>

      {/* API Keys Card */}
      <Card title="API Keys">
         <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Manage API keys for external services (e.g., OpenAI, Trading 212). Keys are stored securely encrypted.
            <strong className="block mt-1">Never share your API keys.</strong>
         </p>
         {/* Add New API Key Form */}
         <Form method="post" className="space-y-4 border-b border-gray-200 dark:border-gray-700 pb-6 mb-6" onSubmit={handleApiKeySubmit}>
            <input type="hidden" name="_action" value="save_api_key" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Add / Update API Key</h3>
            {/* Replace Input with Select */}
            <Select
              id="serviceName"
              name="serviceName"
              label="Service Name"
              value={newServiceName}
              onChange={(e) => setNewServiceName(e.target.value)}
              options={SUPPORTED_API_SERVICES}
              required
              error={apiKeyFieldErrors?.serviceName?.[0] || apiKeyFormErrors?.[0]} // Show field or form error
            />
            <div className="relative">
              <Input
                id="apiKey"
                name="apiKey"
                type={showApiKey ? "text" : "password"}
                label="API Key"
                value={newApiKey}
                onChange={(e) => setNewApiKey(e.target.value)}
                placeholder="Enter the API key"
                required
                error={apiKeyFieldErrors?.apiKey?.[0]}
                className="pr-10" // Add padding for the button
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute inset-y-0 right-0 top-6 pr-3 flex items-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                aria-label={showApiKey ? "Hide API Key" : "Show API Key"}
              >
                {showApiKey ? <FiEyeOff className="h-5 w-5" /> : <FiEye className="h-5 w-5" />}
              </button>
            </div>
             {apiKeyGeneralError && (
               <div className="text-red-600 dark:text-red-400 text-sm">
                 {apiKeyGeneralError}
               </div>
             )}
            <div className="flex justify-end">
              <Button type="submit" isLoading={isApiKeySubmitting && navigation.formData?.get("serviceName") === newServiceName}>
                <FiPlus className="mr-1" /> Save Key
              </Button>
            </div>
         </Form>

         {/* List Saved API Keys */}
         <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Saved Keys</h3>
            {apiKeyServices.length > 0 ? (
              <ul className="space-y-3">
                {apiKeyServices.map((serviceName) => (
                  <li key={serviceName} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                    <div className="flex items-center">
                       <FiKey className="h-5 w-5 text-gray-500 dark:text-gray-400 mr-3" />
                       <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{serviceName}</span>
                    </div>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDeleteApiKey(serviceName)}
                      isLoading={isApiKeySubmitting && navigation.formData?.get("serviceName") === serviceName}
                    >
                      <FiTrash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">No API keys saved yet.</p>
            )}
         </div>
      </Card>

      {/* Account Information Card */}
      <Card title="Account Information">
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</h3>
            <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{user?.email}</p>
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
