import { Outlet, useLoaderData } from "@remix-run/react";
import { LoaderFunctionArgs, redirect } from "@remix-run/node";
import { authenticator } from "~/services/auth.server";
import Layout from "~/components/Layout";
import { useEffect } from "react";
import { getThemeClass } from "~/utils/theme";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await authenticator.isAuthenticated(request);
  
  if (!user) {
    return redirect("/login");
  }
  
  return { user };
}

export default function AppLayout() {
  const { user } = useLoaderData<typeof loader>();
  
  // Apply theme class to document
  useEffect(() => {
    const theme = user.settings.theme || 'light';
    const themeClass = getThemeClass(theme as any);
    
    // Remove existing theme classes
    document.documentElement.classList.remove('light', 'dark');
    
    // Add the appropriate theme class
    document.documentElement.classList.add(themeClass);
  }, [user.settings.theme]);
  
  return (
    <Layout user={user}>
      <Outlet />
    </Layout>
  );
}
