import { cssBundleHref } from "@remix-run/css-bundle";
import type { LinksFunction, LoaderFunctionArgs } from "@remix-run/node";
import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from "@remix-run/react";
import { json } from "@remix-run/node";
import { authenticator } from "~/services/auth.server";
import { useEffect } from "react";
import { getThemeClass } from "~/utils/theme";
import tailwindStylesheetUrl from "./tailwind.css";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: tailwindStylesheetUrl },
  ...(cssBundleHref ? [{ rel: "stylesheet", href: cssBundleHref }] : []),
  { rel: "icon", href: "/favicon.ico" },
];

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await authenticator.isAuthenticated(request);
  
  return json({
    user,
    ENV: {
      NODE_ENV: process.env.NODE_ENV,
    },
  });
}

export default function App() {
  const { user } = useLoaderData<typeof loader>();
  
  // Apply theme class to document
  useEffect(() => {
    if (user?.settings?.theme) {
      const theme = user.settings.theme;
      const themeClass = getThemeClass(theme as any);
      
      // Remove existing theme classes
      document.documentElement.classList.remove('light', 'dark');
      
      // Add the appropriate theme class
      document.documentElement.classList.add(themeClass);
    } else {
      // Default to light theme if no user or no theme setting
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
  }, [user?.settings?.theme]);
  
  return (
    <html lang="en" className="h-full">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="h-full">
        <Outlet />
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}
