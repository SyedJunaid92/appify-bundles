import prisma from "../db.server";
import {
  canonicalizePlanKey,
  type BillingPlanKey,
} from "../constants/billing";
import {
  calculateMonthlyCharge,
  getRecommendedPlan,
} from "../utils/billing-calculation";
import { incrementDailyFromEvent } from "./daily-stats.server";
import {
  bumpCacheVersion,
  cachedJson,
  readCacheVersion,
} from "../services/redis.server";

const BILLING_PERIOD_DAYS = 30;

export async function getOrCreateShopBilling(shop: string) {
  return prisma.shopBilling.upsert({
    where: { shop },
    create: { shop },
    update: {},
  });
}

export async function getShopBilling(shop: string) {
  return prisma.shopBilling.findUnique({ where: { shop } });
}

export async function setActivePlan(
  shop: string,
  planKey: BillingPlanKey,
  shopifySubscriptionId?: string,
) {
  await bumpCacheVersion("billing", shop);
  return prisma.shopBilling.upsert({
    where: { shop },
    create: {
      shop,
      activePlan: planKey,
      shopifySubscriptionId,
    },
    update: {
      activePlan: planKey,
      ...(shopifySubscriptionId ? { shopifySubscriptionId } : {}),
    },
  });
}

export async function incrementOrderCount(shop: string, orderId: string) {
  const existing = await prisma.orderEvent.findUnique({
    where: { shop_orderId: { shop, orderId } },
  });
  if (existing) return null;

  await prisma.orderEvent.create({ data: { shop, orderId } });
  await getOrCreateShopBilling(shop);

  const updated = await prisma.shopBilling.update({
    where: { shop },
    data: { monthlyOrderCount: { increment: 1 } },
  });

  try {
    await incrementDailyFromEvent({
      shop,
      eventType: "order",
    });
  } catch (error) {
    console.error("[daily-stats] order increment failed", shop, error);
  }

  return updated;
}

export async function finalizeBillingPeriod(
  shop: string,
  billing?: Awaited<ReturnType<typeof getOrCreateShopBilling>>,
) {
  const record = billing ?? (await getShopBilling(shop));
  if (!record || record.monthlyOrderCount === 0) return null;

  const charge = calculateMonthlyCharge(record.monthlyOrderCount);
  const planKey = charge.planKey;
  const periodStart = record.orderCountPeriodStart;
  const periodEnd = new Date();

  const existing = await prisma.billingHistory.findFirst({
    where: { shop, periodStart },
  });
  if (existing) return existing;

  return prisma.billingHistory.create({
    data: {
      shopBillingId: record.id,
      shop,
      periodStart,
      periodEnd,
      orderCount: record.monthlyOrderCount,
      planKey,
      baseAmount: charge.baseAmount,
      usageAmount: charge.usageAmount,
      totalAmount: charge.cappedAmount,
      status: "charged",
    },
  });
}

export async function resetBillingPeriod(shop: string, nextPlan?: BillingPlanKey) {
  return prisma.shopBilling.update({
    where: { shop },
    data: {
      monthlyOrderCount: 0,
      orderCountPeriodStart: new Date(),
      ...(nextPlan ? { activePlan: nextPlan } : {}),
    },
  });
}

export async function getBillingHistory(shop: string, limit = 12) {
  return prisma.billingHistory.findMany({
    where: { shop },
    orderBy: { periodStart: "desc" },
    take: limit,
  });
}

export async function getBillingSummary(shop: string) {
  const version = await readCacheVersion("billing", shop);
  return cachedJson(`billing:summary:${shop}:${version}`, 30, () =>
    loadBillingSummary(shop),
  );
}

async function loadBillingSummary(shop: string) {
  const billing = await getOrCreateShopBilling(shop);
  const recommendedPlan = getRecommendedPlan(billing.monthlyOrderCount);
  const activePlan =
    canonicalizePlanKey(billing.activePlan) ?? recommendedPlan;
  const charge = calculateMonthlyCharge(billing.monthlyOrderCount);
  const history = await getBillingHistory(shop, 12);

  return {
    billing,
    recommendedPlan,
    activePlan,
    charge,
    history,
    periodStart: billing.orderCountPeriodStart,
    daysRemaining: daysUntilPeriodEnd(billing.orderCountPeriodStart),
    subscriptionStatus: billing.subscriptionStatus,
    hasActiveSubscription: billing.subscriptionStatus === "ACTIVE",
  };
}

function daysUntilPeriodEnd(periodStart: Date): number {
  const periodEnd = new Date(periodStart);
  periodEnd.setDate(periodEnd.getDate() + BILLING_PERIOD_DAYS);
  const remaining = periodEnd.getTime() - Date.now();
  return Math.max(0, Math.ceil(remaining / (24 * 60 * 60 * 1000)));
}

export async function syncOrderCountFromShopify(
  shop: string,
  orderCount: number,
) {
  return prisma.shopBilling.upsert({
    where: { shop },
    create: { shop, monthlyOrderCount: orderCount },
    update: { monthlyOrderCount: orderCount },
  });
}
