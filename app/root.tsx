import { cssBundleHref } from "@remix-run/css-bundle";
import { json, LinksFunction, LoaderFunctionArgs } from "@remix-run/node";
import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from "@remix-run/react";
import { getUser } from "~/services/auth.server";
import tailwindStylesheetUrl from "~/tailwind.css";
import calendarStylesheetUrl from "~/styles/calendar.css";
import { useEffect, useState } from "react";
import { getTheme, Theme } from "~/utils/theme";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: tailwindStylesheetUrl },
  { rel: "stylesheet", href: calendarStylesheetUrl },
  ...(cssBundleHref ? [{ rel: "stylesheet", href: cssBundleHref }] : []),
];

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await getUser(request);
  const theme = getTheme(request);
  return json({ user, theme });
}

export default function App() {
  const { user, theme: initialTheme } = useLoaderData<typeof loader>();
  const [theme, setTheme] = useState<Theme>(initialTheme);
  
  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);
  
  useEffect(() => {
    setTheme(initialTheme);
  }, [initialTheme]);

  return (
    <html lang="en" className={theme === "dark" ? "dark" : ""}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 min-h-screen">
        <Outlet />
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}
