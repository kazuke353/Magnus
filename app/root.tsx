import { cssBundleHref } from "@remix-run/css-bundle";
import { json, LoaderFunctionArgs, LinksFunction } from "@remix-run/node";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
// LiveReload, <LiveReload />` is obsolete when using Vite and can conflict with Vite's built-in HMR runtime.
} from "@remix-run/react";
import { getUser } from "~/services/session.server";
import { getTheme, getThemeClass } from "~/utils/theme";
import { useEffect } from "react";
import { useTheme } from "~/hooks/useTheme";

const tailwindStylesheetUrl = "./app/styles/tailwind.css";
const calendarStylesheetUrl = "./app/styles/calendar.css";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: tailwindStylesheetUrl },
  { rel: "stylesheet", href: calendarStylesheetUrl },
  ...(cssBundleHref ? [{ rel: "stylesheet", href: cssBundleHref }] : []),
  { rel: "icon", href: "/favicon.ico" },
  { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const user = await getUser(request);
  const theme = getTheme(request);
  
  // Set default locale for consistent date formatting
  const locale = user?.settings?.locale || 'en-US';
  
  return json({ 
    user, 
    theme,
    locale
  });
};

export default function App() {
  const { theme: serverTheme } = useLoaderData<typeof loader>();
  const { theme, updateTheme } = useTheme(serverTheme);
  
  // Get the actual CSS class to apply based on the theme
  const themeClass = getThemeClass(theme);
  
  // Apply theme on initial load
  useEffect(() => {
    if (serverTheme) {
      updateTheme(serverTheme);
    }
  }, [serverTheme, updateTheme]);

  return (
    <html lang="en" className={`${themeClass} h-full`}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <meta name="color-scheme" content={themeClass} />
        <Meta />
        <Links />
      </head>
      <body className="bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 min-h-screen h-full">
        <Outlet />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
