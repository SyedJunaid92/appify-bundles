export const EMBED_SEARCH_PARAMS = [
  "shop",
  "host",
  "embedded",
  "locale",
  "session",
  "id_token",
  "hmac",
  "timestamp",
] as const;

export const BILLING_REAUTH_HEADER =
  "X-Shopify-API-Request-Failure-Reauthorize-Url";

export function appendEmbedSearchParams(
  path: string,
  currentSearch: string,
): string {
  if (!currentSearch) return path;

  const source = new URLSearchParams(
    currentSearch.startsWith("?") ? currentSearch.slice(1) : currentSearch,
  );
  const [pathname, existingQuery = ""] = path.split("?");
  const target = new URLSearchParams(existingQuery);

  for (const key of EMBED_SEARCH_PARAMS) {
    const value = source.get(key);
    if (value && !target.has(key)) {
      target.set(key, value);
    }
  }

  const query = target.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function isBillingReturn(url: URL): boolean {
  return (
    Boolean(url.searchParams.get("charge_id")) ||
    url.searchParams.get("subscribed") === "true" ||
    Boolean(url.searchParams.get("plan_handle"))
  );
}

export function shouldAutoApproveBilling(url: URL): boolean {
  return url.searchParams.get("approve") === "1" && !isBillingReturn(url);
}

export function isBillingGateExempt(pathname: string): boolean {
  return (
    pathname.startsWith("/app/billing") || pathname.startsWith("/app/privacy")
  );
}

export function shopHandleFromRequest(
  request: Request,
  shop?: string,
): string | null {
  const url = new URL(request.url);
  const shopDomain = shop || url.searchParams.get("shop");
  if (shopDomain?.includes(".myshopify.com")) {
    return shopDomain.replace(/\.myshopify\.com$/i, "");
  }

  const host = url.searchParams.get("host");
  if (!host) return null;

  try {
    const padded = host.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
    const match = decoded.match(/store\/([^/]+)/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

/**
 * Return to the embedded admin app, not vercel.app. A hosted return URL
 * bounces through /auth/session-token and leaves a blank Shopify iframe.
 */
export function volumeBillingReturnUrl(request: Request, shop?: string): string {
  const handle = shopHandleFromRequest(request, shop);
  const appHandle = process.env.SHOPIFY_APP_HANDLE || "appify-bundles";
  if (handle) {
    return `https://admin.shopify.com/store/${handle}/apps/${appHandle}/app/billing`;
  }

  const url = new URL(request.url);
  const appUrl = (process.env.SHOPIFY_APP_URL || url.origin).replace(/\/$/, "");
  return `${appUrl}/app/billing`;
}

export function isShopifyAdminCheckoutUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.hostname !== "admin.shopify.com") return false;
    if (url.pathname.includes("/auth/")) return false;
    return (
      url.pathname.includes("/charges") ||
      url.pathname.includes("/app_subscriptions") ||
      url.pathname.includes("/confirm")
    );
  } catch {
    return false;
  }
}

export function confirmationUrlFromBillingResponse(
  error: unknown,
): string | null {
  if (!(error instanceof Response)) return null;
  return (
    error.headers.get(BILLING_REAUTH_HEADER) || error.headers.get("Location")
  );
}

export function billingErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "errorData" in error) {
    const data = (error as { errorData: unknown }).errorData;
    if (Array.isArray(data)) {
      const messages = data
        .map((item) => {
          if (item && typeof item === "object" && "message" in item) {
            return String((item as { message: unknown }).message);
          }
          return null;
        })
        .filter((message): message is string => Boolean(message));
      if (messages.length) return messages.join(" ");
    }
  }
  if (error instanceof Error && error.message) return error.message;
  return "Shopify could not start billing approval. Try Continue on Shopify again.";
}
