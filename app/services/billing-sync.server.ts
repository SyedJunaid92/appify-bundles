import prisma from "../db.server";
import { canonicalizePlanKey, type BillingPlanKey } from "../constants/billing";
import {
  finalizeBillingPeriod,
  getBillingSummary,
  resetBillingPeriod,
} from "../models/billing.server";
import {
  getRecommendedPlan,
  usageChargeForSubscription,
} from "../utils/billing-calculation";

export interface BillingSyncResult {
  shop: string;
  action: "usage_record" | "period_finalized" | "skipped" | "error";
  detail: string;
}

export async function syncBillingForAllShops(): Promise<BillingSyncResult[]> {
  const shops = await prisma.shopBilling.findMany({
    select: { shop: true },
  });

  const results: BillingSyncResult[] = [];

  for (const record of shops) {
    try {
      const result = await syncBillingForShop(record.shop);
      results.push(result);
    } catch (error) {
      results.push({
        shop: record.shop,
        action: "error",
        detail: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return results;
}

export async function syncBillingForShop(
  shop: string,
): Promise<BillingSyncResult> {
  const summary = await getBillingSummary(shop);
  const orderCount = summary.billing.monthlyOrderCount;
  const recommended = getRecommendedPlan(orderCount);
  const subscribed = canonicalizePlanKey(summary.billing.activePlan);

  if (summary.daysRemaining > 0) {
    return {
      shop,
      action: "skipped",
      detail:
        subscribed && subscribed !== recommended
          ? `Period open — volume is ${recommended} (${orderCount} orders); Shopify base stays ${subscribed}`
          : "Period still open",
    };
  }

  const usageResult = await chargeUsageIfNeeded(shop, summary, recommended);
  if (usageResult.action === "error") {
    return usageResult;
  }

  await finalizeBillingPeriod(shop, summary.billing);
  await resetBillingPeriod(shop);

  return {
    shop,
    action: "period_finalized",
    detail:
      usageResult.action === "usage_record"
        ? `Finalized ${orderCount} orders on ${recommended}; ${usageResult.detail}`
        : `Finalized ${orderCount} orders on ${recommended}`,
  };
}

async function chargeUsageIfNeeded(
  shop: string,
  summary: Awaited<ReturnType<typeof getBillingSummary>>,
  recommended: BillingPlanKey,
): Promise<BillingSyncResult> {
  const orderCount = summary.billing.monthlyOrderCount;
  const subscribed = canonicalizePlanKey(summary.billing.activePlan);
  const usageAmount = usageChargeForSubscription(orderCount, subscribed);

  if (usageAmount <= 0) {
    return {
      shop,
      action: "skipped",
      detail: "No extra usage this period",
    };
  }

  return {
    shop,
    action: "skipped",
    detail: `Shopify App Pricing usage for ${recommended} is reported with App Events`,
  };
}
