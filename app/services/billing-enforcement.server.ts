import prisma from "../db.server";
import {
  canonicalizePlanKey,
  type BillingPlanKey,
} from "../constants/billing";
import {
  getRequiredUpgradePlan,
  hasReachedTierLimit,
} from "../utils/billing-calculation";
import { pauseAllActiveBundles, resumePausedBundles } from "../models/bundle.server";
import { getOrCreateShopBilling } from "../models/billing.server";

export interface BillingEnforcementState {
  tierLimitReached: boolean;
  bundlesPausedForBilling: boolean;
  showUpgradeModal: boolean;
  showPausedBanner: boolean;
  upgradePlan: BillingPlanKey | null;
  monthlyOrderCount: number;
  activePlan: BillingPlanKey | null;
}

export async function getBillingEnforcementState(
  shop: string,
): Promise<BillingEnforcementState> {
  const billing = await getOrCreateShopBilling(shop);
  const activePlan = canonicalizePlanKey(billing.activePlan);
  const orderCount = billing.monthlyOrderCount;

  let tierLimitReached = billing.tierLimitReached;
  let upgradePlan: BillingPlanKey | null = null;

  if (activePlan) {
    const atLimit = hasReachedTierLimit(activePlan, orderCount);
    upgradePlan = getRequiredUpgradePlan(activePlan, orderCount);
    tierLimitReached = atLimit;
  }

  const showUpgradeModal =
    tierLimitReached &&
    !billing.bundlesPausedForBilling &&
    upgradePlan !== null;

  const showPausedBanner =
    billing.bundlesPausedForBilling && upgradePlan !== null;

  return {
    tierLimitReached,
    bundlesPausedForBilling: billing.bundlesPausedForBilling,
    showUpgradeModal,
    showPausedBanner,
    upgradePlan,
    monthlyOrderCount: orderCount,
    activePlan,
  };
}

export async function markTierLimitReached(shop: string): Promise<void> {
  const billing = await getOrCreateShopBilling(shop);
  const activePlan = canonicalizePlanKey(billing.activePlan);
  if (!activePlan) return;

  if (!hasReachedTierLimit(activePlan, billing.monthlyOrderCount)) return;

  await prisma.shopBilling.update({
    where: { shop },
    data: { tierLimitReached: true },
  });
}

export async function pauseBundlesForTierLimit(shop: string): Promise<number> {
  const pausedCount = await pauseAllActiveBundles(shop);

  await prisma.shopBilling.update({
    where: { shop },
    data: {
      bundlesPausedForBilling: true,
      tierLimitReached: true,
    },
  });

  return pausedCount;
}

export async function resumeBundlesAfterUpgrade(
  shop: string,
  planKey: BillingPlanKey,
): Promise<number> {
  const billing = await getOrCreateShopBilling(shop);

  if (
    billing.bundlesPausedForBilling &&
    hasReachedTierLimit(planKey, billing.monthlyOrderCount)
  ) {
    return 0;
  }

  const resumedCount = await resumePausedBundles(shop);

  await prisma.shopBilling.update({
    where: { shop },
    data: {
      bundlesPausedForBilling: false,
      tierLimitReached: false,
      activePlan: planKey,
    },
  });

  return resumedCount;
}

export async function checkTierLimitAfterOrder(shop: string): Promise<void> {
  await markTierLimitReached(shop);
}

export function isPublishingBlocked(
  enforcement: Pick<BillingEnforcementState, "bundlesPausedForBilling">,
): boolean {
  return enforcement.bundlesPausedForBilling;
}
