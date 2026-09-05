const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

export const HSTS_HEADER = "max-age=63072000; includeSubDomains; preload";

export function isLocalHostname(hostname: string): boolean {
  return LOCAL_HOSTS.has(hostname) || hostname.endsWith(".localhost");
}

export function forwardedProtocol(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-proto");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim().toLowerCase() || "https";
  }
  return new URL(request.url).protocol.replace(":", "").toLowerCase();
}

export function httpsRedirectUrl(request: Request): string | null {
  const url = new URL(request.url);
  if (isLocalHostname(url.hostname)) return null;
  if (forwardedProtocol(request) === "https") return null;
  url.protocol = "https:";
  return url.toString();
}

export function applyHttpsHeaders(headers: Headers, request: Request): void {
  if (isLocalHostname(new URL(request.url).hostname)) return;
  headers.set("Strict-Transport-Security", HSTS_HEADER);
}
