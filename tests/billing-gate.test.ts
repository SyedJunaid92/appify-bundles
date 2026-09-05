import { describe, expect, it } from "vitest";
import {
  appendEmbedSearchParams,
  billingErrorMessage,
  confirmationUrlFromBillingResponse,
  isBillingGateExempt,
  isBillingReturn,
  isShopifyAdminCheckoutUrl,
  normalizeShopifyCheckoutUrl,
  shopFromAppProxy,
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

  it("returns merchants to the embedded admin billing page", () => {
    const returnUrl = volumeBillingReturnUrl(
      new Request(
        "https://app.example/app?shop=demo.myshopify.com&host=abc&embedded=1&id_token=huge.jwt.token",
      ),
    );
    expect(returnUrl).toBe(
      "https://admin.shopify.com/store/demo/apps/appify-bundles/app/billing",
    );
    expect(returnUrl).not.toContain("id_token");
    expect(returnUrl).not.toContain("vercel.app");
  });

  it("decodes the Shopify host when shop is missing", () => {
    const host = btoa("admin.shopify.com/store/appify-9217");
    const returnUrl = volumeBillingReturnUrl(
      new Request(`https://app.example/app/billing?host=${host}&embedded=1`),
    );
    expect(returnUrl).toContain("/store/appify-9217/apps/appify-bundles/app/billing");
  });

  it("only top-navigates Shopify charge confirmation URLs", () => {
    expect(
      isShopifyAdminCheckoutUrl(
        "https://admin.shopify.com/store/demo/charges/1/confirm",
      ),
    ).toBe(true);
    expect(
      isShopifyAdminCheckoutUrl(
        "https://admin.shopify.com/store/demo/apps/appify-bundles/auth/session-token",
      ),
    ).toBe(false);
    expect(
      isShopifyAdminCheckoutUrl(
        "https://appify-bundles.vercel.app/app/billing?charge_id=1",
      ),
    ).toBe(false);
    expect(
      isShopifyAdminCheckoutUrl(
        "https://appify-9217.myshopify.com/admin/charges/390488195073/33070448895/RecurringApplicationCharge/confirm_recurring_application_charge?signature=abc",
      ),
    ).toBe(true);
    expect(
      normalizeShopifyCheckoutUrl(
        "https://appify-9217.myshopify.com/admin/charges/390488195073/33070448895/RecurringApplicationCharge/confirm_recurring_application_charge?signature=abc",
      ),
    ).toBe(
      "https://admin.shopify.com/store/appify-9217/charges/390488195073/33070448895/RecurringApplicationCharge/confirm_recurring_application_charge?signature=abc",
    );
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

  it("reads the shop from a signed app proxy request without a session", () => {
    const request = new Request(
      "https://app.example/proxy/bundles?shop=appify-9217.myshopify.com&product_id=1",
    );
    expect(shopFromAppProxy(request, undefined)).toBe(
      "appify-9217.myshopify.com",
    );
    expect(shopFromAppProxy(request, "appify-9217.myshopify.com")).toBe(
      "appify-9217.myshopify.com",
    );
    expect(
      shopFromAppProxy(new Request("https://app.example/proxy/bundles"), null),
    ).toBeNull();
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
