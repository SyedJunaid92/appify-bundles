import { describe, expect, it, afterEach } from "vitest";
import { billingModeLabel } from "../app/services/billing-mode.server";
import { isBillingTestModeForced } from "../app/constants/billing";

describe("billingModeLabel", () => {
  it("labels test mode", () => {
    expect(billingModeLabel(true)).toContain("Test");
  });

  it("labels live mode", () => {
    expect(billingModeLabel(false)).toContain("Live");
  });
});

describe("isBillingTestModeForced", () => {
  const original = process.env.SHOPIFY_BILLING_TEST;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.SHOPIFY_BILLING_TEST;
    } else {
      process.env.SHOPIFY_BILLING_TEST = original;
    }
  });

  it("returns null when unset (auto-detect)", () => {
    delete process.env.SHOPIFY_BILLING_TEST;
    expect(isBillingTestModeForced()).toBeNull();
  });

  it("returns true when forced", () => {
    process.env.SHOPIFY_BILLING_TEST = "true";
    expect(isBillingTestModeForced()).toBe(true);
  });

  it("returns false when forced live", () => {
    process.env.SHOPIFY_BILLING_TEST = "false";
    expect(isBillingTestModeForced()).toBe(false);
  });
});
