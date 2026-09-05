import type { LoginError } from "@shopify/shopify-app-react-router/server";
import { LoginErrorType } from "@shopify/shopify-app-react-router/server";

interface LoginErrorMessage {
  shop?: string;
}

export function loginErrorMessage(loginErrors: LoginError): LoginErrorMessage {
  if (loginErrors?.shop === LoginErrorType.MissingShop) {
    return {
      shop: "Open Appify Bundles from your Shopify admin after installing it from the Shopify App Store.",
    };
  } else if (loginErrors?.shop === LoginErrorType.InvalidShop) {
    return {
      shop: "This shop link is not valid. Open the app from your Shopify admin.",
    };
  }

  return {};
}
