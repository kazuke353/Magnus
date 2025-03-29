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
import { getTheme, setTheme } from "~/utils/theme";
import { useEffect } from "react";

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
  return json({ user, theme });
};

export default function App() {
  const { theme } = useLoaderData<typeof loader>();

  useEffect(() => {
    if (theme) {
      document.documentElement.classList.toggle("dark", theme === "dark");
    }
  }, [theme]);

  return (
    <html lang="en" className={theme === "dark" ? "dark h-full" : "light h-full"}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
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
