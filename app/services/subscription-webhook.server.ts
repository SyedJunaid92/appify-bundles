import prisma from "../db.server";
import {
  APPIFY_BUNDLES,
  BILLING_TIERS,
  isVolumeSubscription,
  type BillingPlanKey,
} from "../constants/billing";
import { calculateMonthlyCharge } from "../utils/billing-calculation";
import {
  isActiveSubscriptionStatus,
  isInactiveSubscriptionStatus,
  parsePlanKeyFromSubscription,
  type AppSubscriptionWebhookPayload,
} from "../schemas/subscription-webhook.schema";
import { getOrCreateShopBilling } from "../models/billing.server";
import { resumeBundlesAfterUpgrade } from "../services/billing-enforcement.server";

const SUBSCRIPTION_PERIOD_DAYS = 30;

export interface SubscriptionSyncResult {
  shop: string;
  subscriptionId: string;
  status: string;
  planKey: BillingPlanKey | typeof APPIFY_BUNDLES | null;
  historyRecorded: boolean;
}

export async function syncSubscriptionFromWebhook(
  shop: string,
  payload: AppSubscriptionWebhookPayload,
): Promise<SubscriptionSyncResult> {
  const subscription = payload.app_subscription;
  const planKey = parsePlanKeyFromSubscription(subscription);
  const subscriptionId = subscription.admin_graphql_api_id;
  const status = subscription.status;

  const billing = await getOrCreateShopBilling(shop);

  if (isActiveSubscriptionStatus(status) && planKey) {
    await prisma.shopBilling.update({
      where: { shop },
      data: {
        activePlan: planKey,
        shopifySubscriptionId: subscriptionId,
        subscriptionStatus: status,
      },
    });

    const historyRecorded = await recordSubscriptionChargeIfNew({
      billingId: billing.id,
      shop,
      subscriptionId,
      planKey,
      price: subscription.price,
      updatedAt: subscription.updated_at ?? new Date().toISOString(),
      orderCount: billing.monthlyOrderCount,
    });

    await resumeBundlesAfterUpgrade(shop, planKey);

    return {
      shop,
      subscriptionId,
      status,
      planKey,
      historyRecorded,
    };
  }

  if (isInactiveSubscriptionStatus(status)) {
    const isCurrentSubscription =
      billing.shopifySubscriptionId === subscriptionId ||
      !billing.shopifySubscriptionId;

    if (isCurrentSubscription) {
      await prisma.shopBilling.update({
        where: { shop },
        data: {
          subscriptionStatus: status,
          ...(billing.shopifySubscriptionId === subscriptionId
            ? { activePlan: null, shopifySubscriptionId: null }
            : {}),
        },
      });
    }

    return {
      shop,
      subscriptionId,
      status,
      planKey,
      historyRecorded: false,
    };
  }

  await prisma.shopBilling.update({
    where: { shop },
    data: {
      subscriptionStatus: status,
      ...(planKey ? { activePlan: planKey } : {}),
      shopifySubscriptionId: subscriptionId,
    },
  });

  return {
    shop,
    subscriptionId,
    status,
    planKey,
    historyRecorded: false,
  };
}

async function recordSubscriptionChargeIfNew(options: {
  billingId: string;
  shop: string;
  subscriptionId: string;
  planKey: BillingPlanKey | typeof APPIFY_BUNDLES;
  price?: string;
  updatedAt: string;
  orderCount: number;
}): Promise<boolean> {
  const periodEnd = new Date(options.updatedAt);
  const chargeKey = `${options.subscriptionId}:${periodEnd.toISOString().slice(0, 7)}`;

  const existing = await prisma.billingHistory.findUnique({
    where: { shopifyChargeId: chargeKey },
  });
  if (existing) return false;

  const volume = calculateMonthlyCharge(options.orderCount);
  const tier = isVolumeSubscription(options.planKey)
    ? null
    : BILLING_TIERS[options.planKey as BillingPlanKey];
  const baseAmount = options.price
    ? Number.parseFloat(options.price)
    : (tier?.baseAmount ?? volume.cappedAmount);
  const periodStart = new Date(periodEnd);
  periodStart.setDate(periodStart.getDate() - SUBSCRIPTION_PERIOD_DAYS);

  await prisma.billingHistory.create({
    data: {
      shopBillingId: options.billingId,
      shop: options.shop,
      periodStart,
      periodEnd,
      orderCount: options.orderCount,
      planKey: options.planKey,
      baseAmount,
      usageAmount: 0,
      totalAmount: baseAmount,
      shopifyChargeId: chargeKey,
      status: "charged",
    },
  });

  return true;
}
