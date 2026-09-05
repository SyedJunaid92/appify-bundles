import { unauthenticated } from "../shopify.server";
import {
  buildOrderProcessedEvent,
  isShopifyAppPricingEnabled,
} from "../utils/app-events";

export { buildOrderProcessedEvent, isShopifyAppPricingEnabled };

const AUTH_URL = "https://api.shopify.com/auth/access_token";
const DEFAULT_EVENTS_VERSION = "2026-07";
const TOKEN_REFRESH_SKEW_MS = 60_000;

const SHOP_ID_QUERY = `#graphql
  query AppifyShopId {
    shop {
      id
    }
  }
`;

interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

let cachedToken: CachedToken | null = null;

export function appEventsApiVersion(): string {
  return process.env.SHOPIFY_APP_EVENTS_API_VERSION || DEFAULT_EVENTS_VERSION;
}

export async function getAppEventsAccessToken(): Promise<string | null> {
  const clientId = process.env.SHOPIFY_API_KEY;
  const clientSecret = process.env.SHOPIFY_API_SECRET;
  if (!clientId || !clientSecret) return null;

  if (cachedToken && cachedToken.expiresAt > Date.now() + TOKEN_REFRESH_SKEW_MS) {
    return cachedToken.accessToken;
  }

  const response = await fetch(AUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "client_credentials",
    }),
  });

  if (!response.ok) {
    throw new Error(`App Events auth failed: ${response.status}`);
  }

  const data = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
  };
  if (!data.access_token) {
    throw new Error("App Events auth returned no access token");
  }

  cachedToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  };
  return cachedToken.accessToken;
}

export async function fetchShopGid(shop: string): Promise<string | null> {
  const { admin } = await unauthenticated.admin(shop);
  const response = await admin.graphql(SHOP_ID_QUERY);
  const payload = (await response.json()) as {
    data?: { shop?: { id?: string } };
  };
  return payload.data?.shop?.id ?? null;
}

export async function sendAppEvent(
  event: ReturnType<typeof buildOrderProcessedEvent>,
): Promise<{ success: boolean; error?: string }> {
  const token = await getAppEventsAccessToken();
  if (!token) {
    return { success: false, error: "Missing Shopify API credentials" };
  }

  const response = await fetch(
    `https://api.shopify.com/app/${appEventsApiVersion()}/events`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(event),
    },
  );

  if (response.status === 202) {
    return { success: true };
  }

  const body = (await response.json().catch(() => null)) as {
    error?: string;
  } | null;
  return {
    success: false,
    error: body?.error || `App Events request failed: ${response.status}`,
  };
}

export async function reportOrderProcessedEvent(
  shop: string,
  orderId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const shopId = await fetchShopGid(shop);
    if (!shopId) {
      return { success: false, error: "Could not load shop id" };
    }

    return await sendAppEvent(
      buildOrderProcessedEvent({ shopId, orderId }),
    );
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "App Events failed",
    };
  }
}
