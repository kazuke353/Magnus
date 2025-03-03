import { redirect } from "@remix-run/node";
import { getUserId } from "~/models/user.server";

export async function requireAuth(request: Request) {
  const userId = await getUserId(request);
  if (!userId) {
    throw redirect("/login");
  }
  return userId;
}
