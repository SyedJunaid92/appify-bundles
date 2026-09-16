import { describe, expect, it } from "vitest";
import { isPartnerApiConfigured } from "../app/services/partner-api.server";

describe("Partner API configuration", () => {
  it("is off until org, token, and app GID are set", () => {
    expect(isPartnerApiConfigured({})).toBe(false);
    expect(
      isPartnerApiConfigured({
        SHOPIFY_PARTNER_ORG_ID: "123",
        SHOPIFY_PARTNER_API_ACCESS_TOKEN: "token",
        SHOPIFY_APP_GID: "gid://shopify/App/1",
      }),
    ).toBe(true);
  });
});
