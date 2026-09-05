import { describe, expect, it } from "vitest";
import {
  customersDataRequestSchema,
  customersRedactSchema,
  orderIdsFromCompliancePayload,
  shopRedactSchema,
} from "../app/schemas/compliance-webhook.schema";

describe("GDPR compliance payload helpers", () => {
  it("reads order ids from a customer redact payload", () => {
    expect(
      orderIdsFromCompliancePayload({
        shop_domain: "demo.myshopify.com",
        orders_to_redact: [299938, "280263", 220458],
        customer: { id: 191167, email: "john@example.com" },
      }),
    ).toEqual(["299938", "280263", "220458"]);
  });

  it("reads order ids from a data request payload", () => {
    expect(
      orderIdsFromCompliancePayload({
        orders_requested: [11, 11, 22],
      }),
    ).toEqual(["11", "22"]);
  });

  it("returns an empty list when no orders are present", () => {
    expect(orderIdsFromCompliancePayload({})).toEqual([]);
    expect(orderIdsFromCompliancePayload(null)).toEqual([]);
  });

  it("accepts Shopify compliance payloads", () => {
    expect(
      shopRedactSchema.safeParse({
        shop_id: 954889,
        shop_domain: "demo.myshopify.com",
      }).success,
    ).toBe(true);
    expect(
      customersRedactSchema.safeParse({
        shop_id: 1,
        shop_domain: "demo.myshopify.com",
        customer: { id: 9, email: "a@b.c" },
        orders_to_redact: [1],
      }).success,
    ).toBe(true);
    expect(
      customersDataRequestSchema.safeParse({
        shop_domain: "demo.myshopify.com",
        orders_requested: [1],
        customer: { id: 9 },
        data_request: { id: 99 },
      }).success,
    ).toBe(true);
  });
});
