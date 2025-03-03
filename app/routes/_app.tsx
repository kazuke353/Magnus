import { Outlet, useLoaderData } from "@remix-run/react";
import { json, redirect } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { getUser } from "~/models/user.server";
import Layout from "~/components/Layout";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await getUser(request);
  
  if (!user) {
    return redirect("/login");
  }
  
  return json({ user });
}

export default function AppLayout() {
  const { user } = useLoaderData<typeof loader>();
  
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}
