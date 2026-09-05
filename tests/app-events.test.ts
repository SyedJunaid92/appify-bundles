import { describe, expect, it } from "vitest";
import { ORDER_PROCESSED_EVENT_HANDLE } from "../app/constants/billing";
import {
  buildOrderProcessedEvent,
  isShopifyAppPricingEnabled,
  numericShopId,
  orderProcessedIdempotencyKey,
} from "../app/utils/app-events";
import {
  isShopifyAdminCheckoutUrl,
  shopifyAppPricingPlansUrl,
} from "../app/utils/embedded-app";

describe("App Events order_processed payload", () => {
  it("matches the Shopify App Pricing meter handle", () => {
    const event = buildOrderProcessedEvent({
      shopId: "gid://shopify/Shop/23423423",
      orderId: "1001",
      timestamp: "2026-09-06T00:00:00.000Z",
    });

    expect(event.event_handle).toBe(ORDER_PROCESSED_EVENT_HANDLE);
    expect(event.event_handle).toBe("order_processed");
    expect(event.shop_id).toBe("gid://shopify/Shop/23423423");
    expect(event.attributes.value).toBe(1);
    expect(event.idempotency_key).toBe("op_23423423_1001");
    expect(event.idempotency_key.length).toBeLessThanOrEqual(64);
  });

  it("reads numeric shop ids from GIDs", () => {
    expect(numericShopId("gid://shopify/Shop/99")).toBe("99");
    expect(numericShopId("99")).toBe("99");
    expect(orderProcessedIdempotencyKey("gid://shopify/Shop/99", "abc")).toBe(
      "op_99_abc",
    );
  });

  it("only treats the explicit env flag as enabled", () => {
    expect(isShopifyAppPricingEnabled(undefined)).toBe(false);
    expect(isShopifyAppPricingEnabled("false")).toBe(false);
    expect(isShopifyAppPricingEnabled("true")).toBe(true);
  });
});

describe("Shopify App Pricing plan URL", () => {
  it("opens the hosted plan selection page", () => {
    const url = shopifyAppPricingPlansUrl("demo");
    expect(url).toBe(
      "https://admin.shopify.com/store/demo/charges/appify-bundles/pricing_plans",
    );
    expect(isShopifyAdminCheckoutUrl(url)).toBe(true);
  });
});
