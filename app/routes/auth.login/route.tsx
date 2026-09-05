import { AppProvider } from "@shopify/shopify-app-react-router/react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";

import { login } from "../../shopify.server";
import { loginErrorMessage } from "./error.server";

function shopProvidedByShopify(request: Request): boolean {
  return Boolean(new URL(request.url).searchParams.get("shop"));
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  if (!shopProvidedByShopify(request)) {
    return { shopProvided: false, errors: {} };
  }

  const errors = loginErrorMessage(await login(request));
  return { shopProvided: true, errors };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  if (!shopProvidedByShopify(request)) {
    return { shopProvided: false, errors: {} };
  }

  const errors = loginErrorMessage(await login(request));
  return { errors };
};

export default function Auth() {
  const { shopProvided, errors } = useLoaderData<typeof loader>();

  return (
    <AppProvider embedded={false}>
      <s-page heading="Appify Bundles">
        <s-section heading="Install from Shopify">
          <s-paragraph>
            Appify Bundles is installed from the Shopify App Store and opened
            from your Shopify admin. This app does not ask you to enter a shop
            domain.
          </s-paragraph>
          {errors.shop ? (
            <s-banner tone="critical">{errors.shop}</s-banner>
          ) : null}
          {!shopProvided ? (
            <s-link href="https://apps.shopify.com/appify-bundles">
              Open in the Shopify App Store
            </s-link>
          ) : null}
        </s-section>
      </s-page>
    </AppProvider>
  );
}
