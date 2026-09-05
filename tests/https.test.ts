import { describe, expect, it } from "vitest";
import {
  applyHttpsHeaders,
  forwardedProtocol,
  httpsRedirectUrl,
  isLocalHostname,
} from "../app/utils/https.server";

describe("https utilities", () => {
  it("treats loopback hosts as local", () => {
    expect(isLocalHostname("localhost")).toBe(true);
    expect(isLocalHostname("127.0.0.1")).toBe(true);
    expect(isLocalHostname("app.localhost")).toBe(true);
    expect(isLocalHostname("appify-bundles.vercel.app")).toBe(false);
  });

  it("reads the first forwarded proto", () => {
    const request = new Request("http://appify-bundles.vercel.app/", {
      headers: { "x-forwarded-proto": "https, http" },
    });
    expect(forwardedProtocol(request)).toBe("https");
  });

  it("redirects public HTTP requests to HTTPS", () => {
    const request = new Request("http://appify-bundles.vercel.app/app", {
      headers: { "x-forwarded-proto": "http" },
    });
    expect(httpsRedirectUrl(request)).toBe(
      "https://appify-bundles.vercel.app/app",
    );
  });

  it("does not redirect local development", () => {
    const request = new Request("http://localhost:3000/app");
    expect(httpsRedirectUrl(request)).toBeNull();
  });

  it("does not redirect when already on HTTPS", () => {
    const request = new Request("https://appify-bundles.vercel.app/app", {
      headers: { "x-forwarded-proto": "https" },
    });
    expect(httpsRedirectUrl(request)).toBeNull();
  });

  it("sets HSTS on public hosts only", () => {
    const publicHeaders = new Headers();
    applyHttpsHeaders(
      publicHeaders,
      new Request("https://appify-bundles.vercel.app/"),
    );
    expect(publicHeaders.get("Strict-Transport-Security")).toBe(
      "max-age=63072000; includeSubDomains; preload",
    );

    const localHeaders = new Headers();
    applyHttpsHeaders(localHeaders, new Request("http://localhost:3000/"));
    expect(localHeaders.get("Strict-Transport-Security")).toBeNull();
  });
});
