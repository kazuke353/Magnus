/// <reference types="@remix-run/dev" />
/// <reference types="vite/client" />

import type { User } from "~/db/schema";

declare global {
  interface Window {
    ENV: {
      NODE_ENV: string;
    };
  }
}

declare module "@remix-run/node" {
  interface AppLoadContext {
    user?: User;
  }
}
