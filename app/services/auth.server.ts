import { Authenticator } from "remix-auth";
import { FormStrategy } from "remix-auth-form";
import { sessionStorage } from "~/services/session.server";
import { verifyLogin } from "~/db/user.server";
import { User } from "~/db/schema";

export const authenticator = new Authenticator<User>(sessionStorage);

authenticator.use(
  new FormStrategy(async ({ form }) => {
    const username = form.get("username") as string;
    const password = form.get("password") as string;

    if (!username || !password) {
      throw new Error("Username and password are required");
    }

    const user = await verifyLogin(username, password);
    if (!user) {
      throw new Error("Invalid username or password");
    }

    return user;
  }),
  "user-pass"
);
