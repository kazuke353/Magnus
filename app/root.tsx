import { useEffect } from "react";
import { json } from "@remix-run/node";
import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from "@remix-run/react";
import type { LinksFunction, LoaderFunctionArgs } from "@remix-run/node";

import tailwindStylesheetUrl from "./tailwind.css";
import calendarStylesheetUrl from "./styles/calendar.css";
import { getTheme } from "./utils/theme";

export const links: LinksFunction = () => {
  return [
    { rel: "stylesheet", href: tailwindStylesheetUrl },
    { rel: "stylesheet", href: calendarStylesheetUrl },
    { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
  ];
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // Get theme from cookie
  const theme = getTheme(request);
  
  return json({
    theme,
  });
};

export default function App() {
  const { theme } = useLoaderData<typeof loader>();
  
  // Apply theme class on initial load
  useEffect(() => {
    // Store theme in localStorage for client-side access
    localStorage.setItem('theme', theme);
    
    // Apply theme class
    const themeClass = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(themeClass);
  }, [theme]);
  
  return (
    <html lang="en" className={theme}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <meta name="color-scheme" content={theme === 'dark' ? 'dark' : 'light'} />
        <Meta />
        <Links />
      </head>
      <body className="bg-gray-50 dark:bg-gray-900">
        <Outlet />
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}
