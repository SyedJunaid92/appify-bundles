import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { Outlet, redirect } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { getBundleById } from "../models/bundle.server";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const id = params.id!;
  const { pathname } = new URL(request.url);

  // Only redirect bare /bundles/:id URLs. Child routes like /edit must not redirect.
  const isBareBundleUrl =
    pathname === `/app/bundles/${id}` || pathname === `/app/bundles/${id}/`;

  if (!isBareBundleUrl) {
    return null;
  }

  const { session } = await authenticate.admin(request);
  const bundle = await getBundleById(session.shop, id);

  if (!bundle) {
    throw new Response("Bundle not found", { status: 404 });
  }

  throw redirect(`/app/bundles/${bundle.id}/edit`);
};

export default function BundleIdLayout() {
  return <Outlet />;
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
