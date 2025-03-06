// _app.tsx
import { Outlet, useLoaderData } from "@remix-run/react";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { requireAuthentication } from "~/services/auth.server";
import Layout from "~/components/Layout";
import { useEffect } from "react";
import { getThemeClass } from "~/utils/theme";

// Loader to handle authentication and data loading for the root layout
export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireAuthentication(request);
  return Response.json({ user });
}


export default function AppLayout() {
  const { user } = useLoaderData<typeof loader>()

  // Apply theme class to document
  useEffect(() => {
    const theme = user?.settings?.theme || 'light'; // Safe access, but user is guaranteed to be there by loader
    const themeClass = getThemeClass(theme as any);

    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(themeClass);
  }, [user?.settings?.theme]);

  return (
    <Layout user={user}>
      <Outlet />
    </Layout>
  );
}
