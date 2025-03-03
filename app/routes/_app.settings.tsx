import { useState } from "react";
import { json, redirect } from "@remix-run/node";
import { Form, useActionData, useLoaderData, useNavigation } from "@remix-run/react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";

import { getUser, updateUserSettings } from "~/models/user.server";
import { requireAuth } from "~/utils/auth";
import Card from "~/components/Card";
import Input from "~/components/Input";
import Select from "~/components/Select";
import Button from "~/components/Button";

export async function loader({ request }: LoaderFunctionArgs) {
  await requireAuth(request);
  const user = await getUser(request);
  
  if (!user) {
    return redirect("/login");
  }
  
  return json({ user });
}

export async function action({ request }: ActionFunctionArgs) {
  const userId = await requireAuth(request);
  const formData = await request.formData();
  
  const country = formData.get("country") as string;
  const currency = formData.get("currency") as string;
  const monthlyBudget = parseFloat(formData.get("monthlyBudget") as string);
  
  if (!country || !currency || isNaN(monthlyBudget)) {
    return json(
      { error: "All fields are required and monthly budget must be a number" },
      { status: 400 }
    );
  }
  
  await updateUserSettings(userId, {
    country,
    currency,
    monthlyBudget,
  });
  
  return json({ success: true });
}

export default function Settings() {
  const { user } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  
  const [country, setCountry] = useState(user?.settings.country || "");
  const [currency, setCurrency] = useState(user?.settings.currency || "");
  const [monthlyBudget, setMonthlyBudget] = useState(user?.settings.monthlyBudget.toString() || "");
  
  const countries = [
    { value: "USA", label: "United States" },
    { value: "CAN", label: "Canada" },
    { value: "GBR", label: "United Kingdom" },
    { value: "AUS", label: "Australia" },
    { value: "DEU", label: "Germany" },
    { value: "FRA", label: "France" },
    { value: "JPN", label: "Japan" },
    { value: "CHN", label: "China" },
    { value: "IND", label: "India" },
    { value: "BRA", label: "Brazil" },
  ];
  
  const currencies = [
    { value: "USD", label: "US Dollar ($)" },
    { value: "EUR", label: "Euro (€)" },
    { value: "GBP", label: "British Pound (£)" },
    { value: "JPY", label: "Japanese Yen (¥)" },
    { value: "CAD", label: "Canadian Dollar (C$)" },
    { value: "AUD", label: "Australian Dollar (A$)" },
    { value: "CHF", label: "Swiss Franc (CHF)" },
    { value: "CNY", label: "Chinese Yuan (¥)" },
    { value: "INR", label: "Indian Rupee (₹)" },
    { value: "BRL", label: "Brazilian Real (R$)" },
  ];
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your account settings and preferences
        </p>
      </div>
      
      <Card title="Account Settings">
        <Form method="post" className="space-y-6">
          <Select
            id="country"
            name="country"
            label="Country"
            options={countries}
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            required
          />
          
          <Select
            id="currency"
            name="currency"
            label="Preferred Currency"
            options={currencies}
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            required
          />
          
          <Input
            id="monthlyBudget"
            name="monthlyBudget"
            type="number"
            label="Monthly Investment Budget"
            value={monthlyBudget}
            onChange={(e) => setMonthlyBudget(e.target.value)}
            min="0"
            step="0.01"
            required
          />
          
          {actionData?.error && (
            <div className="text-red-600 text-sm">{actionData.error}</div>
          )}
          
          {actionData?.success && (
            <div className="text-green-600 text-sm">Settings updated successfully!</div>
          )}
          
          <div>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
}
