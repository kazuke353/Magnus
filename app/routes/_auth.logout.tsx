import { redirect } from "@remix-run/node";
import type { ActionFunctionArgs } from "@remix-run/node";
import { logout } from "~/models/user.server";

export async function action({ request }: ActionFunctionArgs) {
  const cookie = await logout(request);
  return redirect("/login", {
    headers: {
      "Set-Cookie": cookie,
    },
  });
}

export async function loader() {
  return redirect("/login");
}

export default function Logout() {
  return null;
}
