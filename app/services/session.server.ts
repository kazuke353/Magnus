import { sessionStorage } from "./auth.server";
import { getUserById } from "~/db/user.server";

export async function getUser(request: Request) {
  const session = await sessionStorage.getSession(request.headers.get("Cookie"));
  const userId = session.get("userId");
  
  if (!userId) {
    return null;
  }
  
  try {
    const user = await getUserById(userId);
    return user;
  } catch (error) {
    console.error("Error in getUser:", error);
    return null;
  }
}
