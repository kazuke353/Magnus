import { Authenticator } from "remix-auth";
import { FormStrategy } from "remix-auth-form";
import { sessionStorage } from "~/services/session.server";
import { verifyLogin } from "~/db/user.server";
import { User } from "~/db/schema";

export const authenticator = new Authenticator<User>(sessionStorage);

authenticator.use(
  new FormStrategy(async ({ form, context }) => { // **ADD context argument**
    console.log("FormStrategy: Strategy function started..."); // **ADD LOG - STRATEGY START**
    const username = form.get("username") as string;
    const password = form.get("password") as string;

    // ... (rest of your verifyLogin logic as before) ...
    const user = await verifyLogin(username, password);
    if (!user) {
      throw new Error("Invalid username or password");
    }

    console.log("FormStrategy: Authentication successful in strategy. About to commit session... "); // **ADD LOG - BEFORE COMMIT**
    // **No direct access to commitSession here, but this log is RIGHT BEFORE it would happen in authenticator**
    const authenticatedUser = user; // Keep user for return

    console.log("FormStrategy: Strategy function completed successfully. Returning user."); // **ADD LOG - STRATEGY END**
    return authenticatedUser; // Return user
  }),
  "user-pass"
);