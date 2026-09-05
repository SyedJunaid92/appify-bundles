import {
  BILLING_TIERS,
  MONTHLY_CHARGE_CAP,
  TIER_500,
  TIER_1500,
  TIER_SCALE,
  USAGE_ORDER_THRESHOLD,
  USAGE_RATE_PER_ORDER,
  canonicalizePlanKey,
  subscribedBaseAmount,
  type BillingPlanKey,
} from "../constants/billing";

export const PLAN_ORDER: BillingPlanKey[] = [TIER_500, TIER_1500, TIER_SCALE];

export interface MonthlyChargeBreakdown {
  planKey: BillingPlanKey;
  orderCount: number;
  baseAmount: number;
  usageAmount: number;
  totalAmount: number;
  cappedAmount: number;
  wasCapped: boolean;
  overageOrders: number;
}

export function getRecommendedPlan(orderCount: number): BillingPlanKey {
  if (orderCount <= BILLING_TIERS[TIER_500].maxOrders) return TIER_500;
  if (orderCount <= BILLING_TIERS[TIER_1500].maxOrders) return TIER_1500;
  return TIER_SCALE;
}

export function calculateMonthlyCharge(
  orderCount: number,
  planKey?: BillingPlanKey | string | null,
): MonthlyChargeBreakdown {
  const volumePlan = getRecommendedPlan(orderCount);
  void planKey;
  const tier = BILLING_TIERS[volumePlan];
  const baseAmount = tier.baseAmount;

  let usageAmount = 0;
  let overageOrders = 0;

  if (tier.hasUsage && orderCount > USAGE_ORDER_THRESHOLD) {
    overageOrders = orderCount - USAGE_ORDER_THRESHOLD;
    usageAmount = roundCurrency(overageOrders * USAGE_RATE_PER_ORDER);
  }

  const totalAmount = roundCurrency(baseAmount + usageAmount);
  const cappedAmount = roundCurrency(Math.min(totalAmount, MONTHLY_CHARGE_CAP));

  return {
    planKey: volumePlan,
    orderCount,
    baseAmount,
    usageAmount,
    totalAmount,
    cappedAmount,
    wasCapped: totalAmount > MONTHLY_CHARGE_CAP,
    overageOrders,
  };
}

export function usageChargeForSubscription(
  orderCount: number,
  subscribedPlan: BillingPlanKey | string | null,
): number {
  const charge = calculateMonthlyCharge(orderCount);
  const subscribedBase = subscribedBaseAmount(subscribedPlan);
  return roundCurrency(Math.max(0, charge.cappedAmount - subscribedBase));
}

export function shouldUpgradePlan(
  currentPlan: BillingPlanKey | string | null,
  orderCount: number,
): BillingPlanKey | null {
  const current = canonicalizePlanKey(currentPlan);
  if (!current) return getRecommendedPlan(orderCount);
  const recommended = getRecommendedPlan(orderCount);
  if (PLAN_ORDER.indexOf(recommended) > PLAN_ORDER.indexOf(current)) {
    return recommended;
  }
  return null;
}

export function shouldDowngradePlan(
  currentPlan: BillingPlanKey | string | null,
  orderCount: number,
): BillingPlanKey | null {
  const current = canonicalizePlanKey(currentPlan);
  if (!current) return null;
  const recommended = getRecommendedPlan(orderCount);
  if (PLAN_ORDER.indexOf(recommended) < PLAN_ORDER.indexOf(current)) {
    return recommended;
  }
  return null;
}

export function hasReachedTierLimit(
  planKey: BillingPlanKey | string | null,
  _orderCount: number,
): boolean {
  void planKey;
  void _orderCount;
  return false;
}

export function getRequiredUpgradePlan(
  currentPlan: BillingPlanKey | string | null,
  orderCount: number,
): BillingPlanKey | null {
  return shouldUpgradePlan(currentPlan, orderCount);
}

export function formatOrderRange(planKey: BillingPlanKey | string): string {
  const key = canonicalizePlanKey(planKey);
  if (!key) return planKey;
  const tier = BILLING_TIERS[key];
  if (tier.maxOrders === Number.POSITIVE_INFINITY) {
    return `${tier.minOrders.toLocaleString()}+ orders`;
  }
  if (tier.minOrders === 0) {
    return `0–${tier.maxOrders.toLocaleString()} orders`;
  }
  return `${tier.minOrders.toLocaleString()}–${tier.maxOrders.toLocaleString()} orders`;
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}
