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

/** After approve or decline, land on billing — never /app — so a decline cannot re-trigger Shopify. */
export function volumeBillingReturnUrl(request: Request): string {
  const url = new URL(request.url);
  const appUrl = (process.env.SHOPIFY_APP_URL || url.origin).replace(/\/$/, "");
  return appendEmbedSearchParams(`${appUrl}/app/billing`, url.search);
}
