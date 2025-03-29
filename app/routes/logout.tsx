import { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { logout } from "~/services/auth.server";
import { errorResponse } from "~/utils/error-handler";

export async function action({ request }: ActionFunctionArgs) {
  try {
    return await logout(request);
  } catch (error) {
    // If it's a redirect, check for Response-like properties
    if (
      error && 
      typeof error === "object" && 
      "status" in error && 
      "headers" in error &&
      typeof (error as any).status === "number" &&
      (error as any).status === 302
    ) {
      return error;
    }
    return errorResponse(error);
  }
}

export function loader({ request }: LoaderFunctionArgs) {
  // Redirect to login page if accessed directly
  return logout(request);
}
