import type { AdminApiContext } from "@shopify/shopify-app-react-router/server";
import { unauthenticated } from "../shopify.server";

const SHOP_BILLING_MODE_QUERY = `#graphql
  query AppifyShopBillingMode {
    shop {
      plan {
        partnerDevelopment
      }
    }
  }
`;

/**
 * Returns true when charges should be test (development/partner stores).
 * Real merchant stores get false (live billing).
 *
 * Override with SHOPIFY_BILLING_TEST=true|false to force mode for all shops.
 */
export async function isShopBillingTestMode(
  admin: Pick<AdminApiContext, "graphql">,
): Promise<boolean> {
  const forced = process.env.SHOPIFY_BILLING_TEST;
  if (forced === "true") return true;
  if (forced === "false") return false;

  try {
    const response = await admin.graphql(SHOP_BILLING_MODE_QUERY);
    const payload = (await response.json()) as {
      data?: { shop?: { plan?: { partnerDevelopment?: boolean } } };
    };
    // partnerDevelopment = true → dev/partner store → test charges
    return Boolean(payload.data?.shop?.plan?.partnerDevelopment ?? true);
  } catch {
    return true;
  }
}

export async function isShopBillingTestModeForShop(
  shop: string,
): Promise<boolean> {
  const { admin } = await unauthenticated.admin(shop);
  return isShopBillingTestMode(admin);
}

export function billingModeLabel(isTest: boolean): string {
  return isTest ? "Test charges (development store)" : "Live charges";
}
