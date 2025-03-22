import { useEffect } from "react";
import { cssBundleHref } from "@remix-run/css-bundle";
import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  useNavigation,
} from "@remix-run/react";
import { json, LoaderFunctionArgs, LinksFunction } from "@remix-run/node";
import { getUser } from "~/services/session.server";
import { getTheme, setTheme } from "~/utils/theme";
import tailwindStylesheetUrl from "~/tailwind.css";
import calendarStylesheetUrl from "~/styles/calendar.css";
import ToastContainer from "~/components/ToastContainer";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: tailwindStylesheetUrl },
  { rel: "stylesheet", href: calendarStylesheetUrl },
  ...(cssBundleHref ? [{ rel: "stylesheet", href: cssBundleHref }] : []),
];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const user = await getUser(request);
  const theme = getTheme(request);
  return json({ user, theme });
};

export default function App() {
  const { theme } = useLoaderData<typeof loader>();
  const navigation = useNavigation();

  useEffect(() => {
    if (theme) {
      document.documentElement.classList.toggle("dark", theme === "dark");
    }
  }, [theme]);

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
        <ToastContainer position="top-right" />
      </body>
    </html>
  );
}
