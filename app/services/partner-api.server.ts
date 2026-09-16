const PARTNER_API_VERSION = "2026-07";

export function isPartnerApiConfigured(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return Boolean(
    env.SHOPIFY_PARTNER_ORG_ID &&
      env.SHOPIFY_PARTNER_API_ACCESS_TOKEN &&
      env.SHOPIFY_APP_GID,
  );
}

/**
 * Canonical Shopify App Pricing subscription check.
 * Returns null when credentials are missing or the shop has no contract.
 * Throws on Partner API failures so callers do not treat a paying shop as unpaid.
 */
export async function fetchActiveSubscription(shopId: string) {
  if (!isPartnerApiConfigured()) return null;

  const orgId = process.env.SHOPIFY_PARTNER_ORG_ID;
  const token = process.env.SHOPIFY_PARTNER_API_ACCESS_TOKEN;
  const appId = process.env.SHOPIFY_APP_GID;
  const response = await fetch(
    `https://partners.shopify.com/${orgId}/api/${PARTNER_API_VERSION}/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": token || "",
      },
      body: JSON.stringify({
        query: `query AppifyActiveSubscription($appId: ID!, $shopId: ID!) {
          activeSubscription(appId: $appId, shopId: $shopId) {
            billingPeriod
            trialEndsAt
            items { handle }
          }
        }`,
        variables: { appId, shopId },
      }),
    },
  );

  const payload = (await response.json()) as {
    data?: { activeSubscription?: { billingPeriod?: string } | null };
    errors?: unknown;
  };

  if (!response.ok || payload.errors) {
    throw new Error(
      `Partner API request failed: ${JSON.stringify(payload.errors ?? response.status)}`,
    );
  }

  return payload.data?.activeSubscription ?? null;
}
