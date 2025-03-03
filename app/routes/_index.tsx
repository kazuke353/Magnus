import { redirect } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { getUserId } from "~/models/user.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await getUserId(request);
  if (userId) {
    return redirect("/dashboard");
  }
  return redirect("/login");
}

export default function Index() {
  return null;
}
