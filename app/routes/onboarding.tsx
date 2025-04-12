import { useState, useEffect } from "react";
import { Form, useLoaderData, useActionData, useNavigation, useSubmit } from "@remix-run/react";
import { LoaderFunctionArgs, ActionFunctionArgs, json, redirect } from "@remix-run/node";
import { requireAuthentication } from "~/services/auth.server";
import { updateUserSettings, getUserById } from "~/db/user.server";
import { listUserApiKeyServices, saveUserApiKey } from "~/db/apiKeys.server";
import Button from "~/components/Button";
import Input from "~/components/Input";
import Select from "~/components/Select";
import type { SelectOption } from "~/components/Select";
import { countries } from "~/utils/countries";
import { currencies } from "~/utils/currencies";
import { z } from "zod";
import { FiMapPin, FiDollarSign, FiKey, FiCheckCircle, FiArrowRight, FiEye, FiEyeOff, FiCalendar, FiBriefcase } from "react-icons/fi"; // Added icons
import { showToast } from "~/components/ToastContainer";

// Define the list of supported services for API keys during onboarding
const ONBOARDING_API_SERVICES: SelectOption[] = [
  { value: "", label: "Select a service..." },
  { value: "trading212", label: "Trading 212" },
  { value: "openai", label: "OpenAI" },
];

// Schemas for validation
const SettingsSchema = z.object({
  country: z.string().min(1, "Country is required"),
  currency: z.string().min(1, "Currency is required"),
  // Added budget and deposit day validation
  monthlyBudget: z.coerce.number().min(0, "Budget must be zero or positive"), // Coerce to number
  expectedDepositDay: z.coerce.number().int().min(1, "Day must be between 1 and 31").max(31, "Day must be between 1 and 31"), // Coerce to number
});

const ApiKeySchema = z.object({
  serviceName: z.enum(ONBOARDING_API_SERVICES.filter(s => s.value).map(s => s.value) as [string, ...string[]]),
  apiKey: z.string().min(10, "API Key seems too short"),
});

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireAuthentication(request);
  // Redirect if onboarding is already complete (e.g., country and currency are set)
  // Keep the check simple for now, rely on user navigating away if already set up
  // if (user.settings?.country && user.settings?.currency && user.settings?.monthlyBudget !== undefined && user.settings?.expectedDepositDay) {
  //   return redirect("/dashboard");
  // }
  const apiKeyServices = await listUserApiKeyServices(user.id);
  return json({ user, apiKeyServices, countries, currencies });
}

export async function action({ request }: ActionFunctionArgs) {
  const user = await requireAuthentication(request);
  const formData = await request.formData();
  const step = parseInt(formData.get("step") as string || "1");

  if (step === 1) { // Save Country, Currency, Budget, Deposit Day
    const country = formData.get("country") as string || '';
    const currency = formData.get("currency") as string || '';
    const monthlyBudget = formData.get("monthlyBudget") as string || '0'; // Get as string
    const expectedDepositDay = formData.get("expectedDepositDay") as string || '1'; // Get as string

    try {
      // Zod schema now handles coercion and validation
      const validatedData = SettingsSchema.parse({ country, currency, monthlyBudget, expectedDepositDay });
      await updateUserSettings(user.id, validatedData);
      return json({ success: true, nextStep: 2 });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return json({ step: 1, fieldErrors: error.flatten().fieldErrors }, { status: 400 });
      }
      console.error("Onboarding Step 1 Error:", error);
      return json({ step: 1, error: (error as Error).message || "Failed to save settings." }, { status: 500 });
    }
  }

  if (step === 2) { // Save API Keys (Optional)
    const serviceName = formData.get("serviceName") as string;
    const apiKey = formData.get("apiKey") as string;

    // If both are empty, user is skipping this step
    if (!serviceName && !apiKey) {
      return redirect("/dashboard"); // Skip and go to dashboard
    }

    // If one is provided but not the other, it's an error (unless skipping)
    if (!serviceName || !apiKey) {
      return json({ step: 2, error: "Both Service Name and API Key are required to save a key." }, { status: 400 });
    }

    try {
      ApiKeySchema.parse({ serviceName, apiKey });
      await saveUserApiKey(user.id, serviceName, apiKey);
      showToast({ type: "success", message: `API Key for ${serviceName} saved.` });
      // Allow adding another key or finishing
      return json({ success: true, step: 2, apiKeySaved: serviceName });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return json({ step: 2, fieldErrors: error.flatten().fieldErrors }, { status: 400 });
      }
      console.error("Onboarding Step 2 Error:", error);
      return json({ step: 2, error: (error as Error).message || "Failed to save API key." }, { status: 500 });
    }
  }

  return json({ error: "Invalid step" }, { status: 400 });
}

export default function Onboarding() {
  const { user, apiKeyServices: initialApiKeyServices, countries, currencies } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const submit = useSubmit();

  const [currentStep, setCurrentStep] = useState(1);
  // Initialize state from user settings or defaults
  const [selectedCountry, setSelectedCountry] = useState(user?.settings?.country || '');
  const [selectedCurrency, setSelectedCurrency] = useState(user?.settings?.currency || '');
  const [monthlyBudget, setMonthlyBudget] = useState(user?.settings?.monthlyBudget?.toString() || '1000'); // Default budget
  const [expectedDepositDay, setExpectedDepositDay] = useState(user?.settings?.expectedDepositDay?.toString() || '1'); // Default day

  const [apiKeyServices, setApiKeyServices] = useState<string[]>(initialApiKeyServices || []);
  const [newServiceName, setNewServiceName] = useState("");
  const [newApiKey, setNewApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);

  const isSubmitting = navigation.state === "submitting";

  // Handle step transitions and API key state updates
  useEffect(() => {
    if (actionData?.success && actionData.nextStep) {
      setCurrentStep(actionData.nextStep);
    }
    if (actionData?.success && actionData.apiKeySaved && !apiKeyServices.includes(actionData.apiKeySaved)) {
      setApiKeyServices(prev => [...prev, actionData.apiKeySaved].sort());
      // Reset form for potentially adding another key
      setNewServiceName("");
      setNewApiKey("");
      setShowApiKey(false);
    }
  }, [actionData]);

  const fieldErrors = actionData?.step === currentStep ? actionData.fieldErrors : null;
  const generalError = actionData?.step === currentStep ? actionData.error : null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-indigo-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl w-full bg-white dark:bg-gray-800 shadow-2xl rounded-xl overflow-hidden">
        <div className="p-8 space-y-8">
          <div>
            <h2 className="text-center text-3xl font-extrabold text-gray-900 dark:text-gray-100">
              Welcome to Magnus, {user?.firstName || 'User'}!
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
              Let's set up your account quickly.
            </p>
          </div>

          {/* Step Indicator */}
          <nav aria-label="Progress">
            <ol role="list" className="flex items-center">
              {[1, 2, 3].map((stepNumber, stepIdx) => (
                <li key={stepNumber} className={`relative ${stepIdx !== 2 ? 'pr-8 sm:pr-20' : ''}`}>
                  {stepNumber < currentStep ? (
                    <>
                      <div className="absolute inset-0 flex items-center" aria-hidden="true">
                        <div className="h-0.5 w-full bg-blue-600" />
                      </div>
                      <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 hover:bg-blue-900">
                        <FiCheckCircle className="h-5 w-5 text-white" aria-hidden="true" />
                      </span>
                    </>
                  ) : stepNumber === currentStep ? (
                    <>
                      <div className="absolute inset-0 flex items-center" aria-hidden="true">
                        <div className="h-0.5 w-full bg-gray-200 dark:bg-gray-700" />
                      </div>
                      <span className="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-blue-600 bg-white dark:bg-gray-800" aria-current="step">
                        <span className="h-2.5 w-2.5 rounded-full bg-blue-600" aria-hidden="true" />
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="absolute inset-0 flex items-center" aria-hidden="true">
                        <div className="h-0.5 w-full bg-gray-200 dark:bg-gray-700" />
                      </div>
                      <span className="group relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-gray-400 dark:hover:border-gray-500">
                        <span className="h-2.5 w-2.5 rounded-full bg-transparent group-hover:bg-gray-300 dark:group-hover:bg-gray-600" aria-hidden="true" />
                      </span>
                    </>
                  )}
                </li>
              ))}
            </ol>
          </nav>

          {/* Step Content */}
          <div className="mt-8">
            {/* Step 1: Country, Currency, Budget, Deposit Day */}
            {currentStep === 1 && (
              <Form method="post" className="space-y-6">
                <input type="hidden" name="step" value="1" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Basic Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Select
                    id="country"
                    name="country"
                    label="Your Country"
                    options={countries}
                    value={selectedCountry}
                    onChange={(e) => setSelectedCountry(e.target.value)}
                    error={fieldErrors?.country?.[0]}
                    required
                  />
                  <Select
                    id="currency"
                    name="currency"
                    label="Primary Currency"
                    options={currencies}
                    value={selectedCurrency}
                    onChange={(e) => setSelectedCurrency(e.target.value)}
                    error={fieldErrors?.currency?.[0]}
                    required
                  />
                  <Input
                    id="monthlyBudget"
                    name="monthlyBudget"
                    label="Monthly Budget"
                    type="number"
                    step="1"
                    min="0"
                    value={monthlyBudget}
                    onChange={(e) => setMonthlyBudget(e.target.value)}
                    error={fieldErrors?.monthlyBudget?.[0]}
                    required
                    icon={FiBriefcase}
                  />
                  <Input
                    id="expectedDepositDay"
                    name="expectedDepositDay"
                    label="Expected Deposit Day"
                    type="number"
                    min="1"
                    max="31"
                    step="1"
                    value={expectedDepositDay}
                    onChange={(e) => setExpectedDepositDay(e.target.value)}
                    error={fieldErrors?.expectedDepositDay?.[0]}
                    required
                    icon={FiCalendar}
                    helpText="Day of the month (1-31)"
                  />
                </div>
                {generalError && <p className="text-sm text-red-600 dark:text-red-400">{generalError}</p>}
                <Button type="submit" className="w-full" isLoading={isSubmitting}>
                  Next: API Keys (Optional) <FiArrowRight className="ml-2" />
                </Button>
              </Form>
            )}

            {/* Step 2: API Keys (Optional) */}
            {currentStep === 2 && (
              <Form method="post" className="space-y-6">
                <input type="hidden" name="step" value="2" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Connect Services (Optional)</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Add API keys for services like Trading 212 (for portfolio import) or OpenAI (for AI chat features). You can skip this and add them later in Settings. Keys are stored securely encrypted.
                </p>

                {/* List already saved keys */}
                {apiKeyServices.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Connected Services:</p>
                    <ul className="list-disc list-inside text-sm text-green-600 dark:text-green-400">
                      {apiKeyServices.map(service => <li key={service}>{service}</li>)}
                    </ul>
                  </div>
                )}

                {/* Form to add a new key */}
                <Select
                  id="serviceName"
                  name="serviceName"
                  label="Service Name"
                  value={newServiceName}
                  onChange={(e) => setNewServiceName(e.target.value)}
                  options={ONBOARDING_API_SERVICES}
                  error={fieldErrors?.serviceName?.[0]}
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
                    error={fieldErrors?.apiKey?.[0]}
                    className="pr-10"
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

                {generalError && <p className="text-sm text-red-600 dark:text-red-400">{generalError}</p>}

                <div className="flex flex-col sm:flex-row justify-between gap-4">
                  <Button type="submit" variant="secondary" isLoading={isSubmitting && !!newServiceName}>
                    <FiKey className="mr-2" /> Save API Key & Add Another
                  </Button>
                  <Button type="submit" name="finish" value="true" className="w-full sm:w-auto" isLoading={isSubmitting && !newServiceName}>
                    Finish Setup <FiCheckCircle className="ml-2" />
                  </Button>
                </div>
                <p className="text-xs text-center text-gray-500 dark:text-gray-400">Click "Finish Setup" without entering a key to skip this step.</p>
              </Form>
            )}

            {/* Step 3: Finished (Redirect handled by action) */}
            {currentStep === 3 && (
              <div className="text-center space-y-4">
                <FiCheckCircle className="mx-auto h-12 w-12 text-green-500" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Setup Complete!</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  You're all set. Redirecting you to the dashboard...
                </p>
                {/* Optional: Add a manual redirect button if needed */}
                {/* <Button onClick={() => window.location.href = '/dashboard'}>Go to Dashboard</Button> */}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
