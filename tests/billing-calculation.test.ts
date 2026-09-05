import { describe, expect, it } from "vitest";
import {
  APPIFY_BUNDLES,
  MONTHLY_CHARGE_CAP,
  TIER_1000,
  TIER_1500,
  TIER_500,
  TIER_ENTERPRISE,
  TIER_SCALE,
  canonicalizePlanKey,
  subscribedBaseAmount,
} from "../app/constants/billing";
import {
  calculateMonthlyCharge,
  formatOrderRange,
  getRecommendedPlan,
  getRequiredUpgradePlan,
  hasReachedTierLimit,
  shouldDowngradePlan,
  shouldUpgradePlan,
  usageChargeForSubscription,
} from "../app/utils/billing-calculation";

describe("getRecommendedPlan", () => {
  it("returns TIER_500 for 0–500 orders", () => {
    expect(getRecommendedPlan(0)).toBe(TIER_500);
    expect(getRecommendedPlan(250)).toBe(TIER_500);
    expect(getRecommendedPlan(500)).toBe(TIER_500);
  });

  it("returns TIER_1500 for 501–1500 orders", () => {
    expect(getRecommendedPlan(501)).toBe(TIER_1500);
    expect(getRecommendedPlan(1500)).toBe(TIER_1500);
  });

  it("returns TIER_SCALE for 1501+ orders", () => {
    expect(getRecommendedPlan(1501)).toBe(TIER_SCALE);
    expect(getRecommendedPlan(50000)).toBe(TIER_SCALE);
  });
});

describe("calculateMonthlyCharge", () => {
  it("charges $50 for 0–500 orders", () => {
    const charge = calculateMonthlyCharge(400);
    expect(charge.planKey).toBe(TIER_500);
    expect(charge.baseAmount).toBe(50);
    expect(charge.usageAmount).toBe(0);
    expect(charge.cappedAmount).toBe(50);
    expect(charge.wasCapped).toBe(false);
  });

  it("charges $125 for 501–1500 orders", () => {
    const charge = calculateMonthlyCharge(800);
    expect(charge.planKey).toBe(TIER_1500);
    expect(charge.baseAmount).toBe(125);
    expect(charge.cappedAmount).toBe(125);
    expect(charge.usageAmount).toBe(0);
  });

  it("charges $175 plus $0.01 per order over 1500", () => {
    const charge = calculateMonthlyCharge(2000);
    expect(charge.planKey).toBe(TIER_SCALE);
    expect(charge.baseAmount).toBe(175);
    expect(charge.overageOrders).toBe(500);
    expect(charge.usageAmount).toBe(5);
    expect(charge.cappedAmount).toBe(180);
  });

  it("has no per-order overage at exactly 1500", () => {
    const charge = calculateMonthlyCharge(1500);
    expect(charge.usageAmount).toBe(0);
    expect(charge.cappedAmount).toBe(125);
  });

  it("applies monthly cap at $799.99", () => {
    const charge = calculateMonthlyCharge(100000);
    expect(charge.totalAmount).toBeGreaterThan(MONTHLY_CHARGE_CAP);
    expect(charge.cappedAmount).toBe(MONTHLY_CHARGE_CAP);
    expect(charge.wasCapped).toBe(true);
  });

  it("uses volume, not the subscribed plan, for the amount", () => {
    const charge = calculateMonthlyCharge(2000, TIER_500);
    expect(charge.planKey).toBe(TIER_SCALE);
    expect(charge.cappedAmount).toBe(180);
  });
});

describe("usageChargeForSubscription", () => {
  it("charges the delta above a Starter Shopify base", () => {
    expect(usageChargeForSubscription(800, TIER_500)).toBe(75);
    expect(usageChargeForSubscription(2000, TIER_500)).toBe(130);
  });

  it("charges only Scale overage when subscribed to Scale", () => {
    expect(usageChargeForSubscription(2000, TIER_SCALE)).toBe(5);
    expect(usageChargeForSubscription(100, TIER_SCALE)).toBe(0);
  });

  it("uses the legacy Shopify base when still on TIER_1000", () => {
    expect(subscribedBaseAmount(TIER_1000)).toBe(40);
    expect(usageChargeForSubscription(400, TIER_1000)).toBe(10);
  });

  it("charges the full volume price on the single usage subscription", () => {
    expect(subscribedBaseAmount(APPIFY_BUNDLES)).toBe(0);
    expect(usageChargeForSubscription(400, APPIFY_BUNDLES)).toBe(50);
    expect(usageChargeForSubscription(800, APPIFY_BUNDLES)).toBe(125);
    expect(usageChargeForSubscription(2000, APPIFY_BUNDLES)).toBe(180);
  });
});

describe("shouldUpgradePlan", () => {
  it("recommends the next volume plan", () => {
    expect(shouldUpgradePlan(TIER_500, 800)).toBe(TIER_1500);
    expect(shouldUpgradePlan(TIER_1500, 2000)).toBe(TIER_SCALE);
    expect(shouldUpgradePlan(TIER_1000, 800)).toBe(TIER_1500);
  });

  it("returns null when on the correct or higher plan", () => {
    expect(shouldUpgradePlan(TIER_500, 400)).toBeNull();
    expect(shouldUpgradePlan(TIER_SCALE, 2000)).toBeNull();
  });
});

describe("shouldDowngradePlan", () => {
  it("recommends a lower plan when volume drops", () => {
    expect(shouldDowngradePlan(TIER_1500, 200)).toBe(TIER_500);
    expect(shouldDowngradePlan(TIER_SCALE, 800)).toBe(TIER_1500);
    expect(shouldDowngradePlan(TIER_ENTERPRISE, 200)).toBe(TIER_500);
  });

  it("returns null when on the correct plan", () => {
    expect(shouldDowngradePlan(TIER_500, 200)).toBeNull();
  });
});

describe("formatOrderRange", () => {
  it("formats the new tier ranges", () => {
    expect(formatOrderRange(TIER_500)).toBe("0–500 orders");
    expect(formatOrderRange(TIER_1500)).toBe("501–1,500 orders");
    expect(formatOrderRange(TIER_SCALE)).toBe("1,501+ orders");
  });

  it("formats legacy keys through canonicalize", () => {
    expect(formatOrderRange(TIER_1000)).toBe("0–500 orders");
    expect(formatOrderRange(TIER_ENTERPRISE)).toBe("1,501+ orders");
  });
});

describe("hasReachedTierLimit", () => {
  it("never pauses bundles under auto-adjust billing", () => {
    expect(hasReachedTierLimit(TIER_500, 500)).toBe(false);
    expect(hasReachedTierLimit(TIER_500, 2000)).toBe(false);
    expect(hasReachedTierLimit(TIER_SCALE, 100000)).toBe(false);
  });
});

describe("getRequiredUpgradePlan", () => {
  it("returns the volume plan when subscribed below volume", () => {
    expect(getRequiredUpgradePlan(TIER_500, 800)).toBe(TIER_1500);
    expect(getRequiredUpgradePlan(TIER_1500, 2000)).toBe(TIER_SCALE);
  });

  it("returns null when volume fits the subscribed plan", () => {
    expect(getRequiredUpgradePlan(TIER_500, 200)).toBeNull();
  });
});

describe("canonicalizePlanKey", () => {
  it("maps legacy Shopify plan names onto the new keys", () => {
    expect(canonicalizePlanKey(TIER_1000)).toBe(TIER_500);
    expect(canonicalizePlanKey(TIER_ENTERPRISE)).toBe(TIER_SCALE);
    expect(canonicalizePlanKey("unknown")).toBeNull();
  });
});
