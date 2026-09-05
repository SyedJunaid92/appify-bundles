import { describe, expect, it } from "vitest";
import {
  parsePlanKeyFromSubscriptionName,
  isActiveSubscriptionStatus,
  isInactiveSubscriptionStatus,
  appSubscriptionWebhookSchema,
} from "../app/schemas/subscription-webhook.schema";

describe("parsePlanKeyFromSubscriptionName", () => {
  it("maps billing plan keys", () => {
    expect(parsePlanKeyFromSubscriptionName("TIER_500")).toBe("TIER_500");
    expect(parsePlanKeyFromSubscriptionName("TIER_SCALE")).toBe("TIER_SCALE");
    expect(parsePlanKeyFromSubscriptionName("TIER_1000")).toBe("TIER_500");
    expect(parsePlanKeyFromSubscriptionName("TIER_ENTERPRISE")).toBe(
      "TIER_SCALE",
    );
    expect(parsePlanKeyFromSubscriptionName("APPIFY_BUNDLES")).toBe(
      "APPIFY_BUNDLES",
    );
  });

  it("returns null for unknown names", () => {
    expect(parsePlanKeyFromSubscriptionName("Growth 1K")).toBeNull();
  });
});

describe("subscription status helpers", () => {
  it("identifies active status", () => {
    expect(isActiveSubscriptionStatus("ACTIVE")).toBe(true);
    expect(isActiveSubscriptionStatus("PENDING")).toBe(false);
  });

  it("identifies inactive statuses", () => {
    expect(isInactiveSubscriptionStatus("CANCELLED")).toBe(true);
    expect(isInactiveSubscriptionStatus("EXPIRED")).toBe(true);
    expect(isInactiveSubscriptionStatus("ACTIVE")).toBe(false);
  });
});

describe("appSubscriptionWebhookSchema", () => {
  it("parses sample payload", () => {
    const result = appSubscriptionWebhookSchema.safeParse({
      app_subscription: {
        admin_graphql_api_id: "gid://shopify/AppSubscription/1029266950",
        name: "TIER_2000",
        status: "ACTIVE",
        created_at: "2026-07-01T00:00:00Z",
        updated_at: "2026-07-07T00:00:00Z",
        price: "75.00",
        currency: "USD",
        interval: "every_30_days",
      },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.app_subscription.name).toBe("TIER_2000");
    }
  });

  it("accepts usage subscriptions without created_at or price", () => {
    const result = appSubscriptionWebhookSchema.safeParse({
      app_subscription: {
        admin_graphql_api_id: "gid://shopify/AppSubscription/1",
        name: "APPIFY_BUNDLES",
        status: "ACTIVE",
        capped_amount: "799.99",
        currency: "USD",
      },
    });
    expect(result.success).toBe(true);
  });
});
