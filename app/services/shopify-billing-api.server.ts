import "@shopify/shopify-api/adapters/web-api";
import { shopifyApi, ApiVersion } from "@shopify/shopify-api";
import { SHOPIFY_BILLING_PLAN_KEYS } from "../constants/billing";

let client: ReturnType<typeof shopifyApi> | null = null;

function getShopifyApi() {
  if (!client) {
    const appUrl = process.env.SHOPIFY_APP_URL || "";
    client = shopifyApi({
      apiKey: process.env.SHOPIFY_API_KEY || "",
      apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
      scopes: process.env.SCOPES?.split(",") || [],
      hostName: new URL(appUrl).hostname,
      apiVersion: ApiVersion.April26,
      isEmbeddedApp: true,
    });
  }
  return client;
}

export async function checkShopBilling(
  session: import("@shopify/shopify-api").Session,
  isTest: boolean,
) {
  return getShopifyApi().billing.check({
    session,
    plans: [...SHOPIFY_BILLING_PLAN_KEYS],
    isTest,
    returnObject: true,
  });
}

export async function createShopUsageRecord(
  session: import("@shopify/shopify-api").Session,
  options: {
    description: string;
    amount: number;
    idempotencyKey: string;
    isTest: boolean;
  },
) {
  return getShopifyApi().billing.createUsageRecord({
    session,
    description: options.description,
    price: { amount: options.amount, currencyCode: "USD" },
    isTest: options.isTest,
    idempotencyKey: options.idempotencyKey,
  });
}
