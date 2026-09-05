import { describe, expect, it } from "vitest";
import {
  appendEmbedSearchParams,
  billingErrorMessage,
  confirmationUrlFromBillingResponse,
  isBillingGateExempt,
  isBillingReturn,
  shouldAutoApproveBilling,
  volumeBillingReturnUrl,
} from "../app/utils/embedded-app";

describe("billing gate helpers", () => {
  it("sends unpaid app pages to billing", () => {
    expect(isBillingGateExempt("/app")).toBe(false);
    expect(isBillingGateExempt("/app/bundles")).toBe(false);
    expect(isBillingGateExempt("/app/billing")).toBe(true);
    expect(isBillingGateExempt("/app/privacy")).toBe(true);
  });

  it("detects a return from Shopify billing", () => {
    expect(isBillingReturn(new URL("https://app.example/app?charge_id=1"))).toBe(
      true,
    );
    expect(
      isBillingReturn(new URL("https://app.example/app?subscribed=true")),
    ).toBe(true);
    expect(isBillingReturn(new URL("https://app.example/app"))).toBe(false);
  });

  it("auto-approves only the first billing landing", () => {
    expect(
      shouldAutoApproveBilling(
        new URL("https://app.example/app/billing?approve=1"),
      ),
    ).toBe(true);
    expect(
      shouldAutoApproveBilling(
        new URL("https://app.example/app/billing?approve=1&charge_id=99"),
      ),
    ).toBe(false);
    expect(
      shouldAutoApproveBilling(new URL("https://app.example/app/billing")),
    ).toBe(false);
  });

  it("returns declined merchants to billing, not the app home", () => {
    const returnUrl = volumeBillingReturnUrl(
      new Request(
        "https://app.example/app?shop=demo.myshopify.com&host=abc&embedded=1&id_token=huge.jwt.token",
      ),
    );
    expect(returnUrl).toContain("/app/billing");
    expect(returnUrl).not.toContain("approve=1");
    expect(returnUrl).not.toContain("id_token");
    expect(returnUrl).toContain("shop=demo.myshopify.com");
    expect(returnUrl).toContain("host=abc");
  });

  it("reads Shopify's billing confirmation URL from the 401 response", () => {
    const url = confirmationUrlFromBillingResponse(
      new Response(null, {
        status: 401,
        headers: {
          "X-Shopify-API-Request-Failure-Reauthorize-Url":
            "https://admin.shopify.com/charges/confirm",
        },
      }),
    );
    expect(url).toBe("https://admin.shopify.com/charges/confirm");
    expect(billingErrorMessage(new Error("plan missing"))).toContain(
      "plan missing",
    );
  });

  it("keeps Shopify embed params on the billing redirect", () => {
    const next = appendEmbedSearchParams(
      "/app/billing?approve=1",
      "?shop=demo.myshopify.com&host=abc&embedded=1",
    );
    expect(next).toContain("approve=1");
    expect(next).toContain("shop=demo.myshopify.com");
    expect(next).toContain("host=abc");
    expect(next).toContain("embedded=1");
  });
});
