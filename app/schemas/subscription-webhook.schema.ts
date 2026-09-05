import { z } from "zod";
import {
  APPIFY_BUNDLES,
  canonicalizePlanKey,
  isVolumeSubscription,
  type BillingPlanKey,
} from "../constants/billing";

export const APP_SUBSCRIPTION_STATUSES = [
  "ACTIVE",
  "PENDING",
  "DECLINED",
  "EXPIRED",
  "FROZEN",
  "CANCELLED",
] as const;

export type AppSubscriptionStatus = (typeof APP_SUBSCRIPTION_STATUSES)[number];

export const appSubscriptionWebhookSchema = z.object({
  app_subscription: z
    .object({
      admin_graphql_api_id: z.string(),
      name: z.string(),
      status: z.enum(APP_SUBSCRIPTION_STATUSES),
      admin_graphql_api_shop_id: z.string().optional(),
      created_at: z.string().optional(),
      updated_at: z.string().optional(),
      currency: z.string().optional(),
      capped_amount: z.string().optional(),
      price: z.string().optional(),
      interval: z.string().optional(),
      plan_handle: z.string().optional(),
    })
    .passthrough(),
});

export type AppSubscriptionWebhookPayload = z.infer<
  typeof appSubscriptionWebhookSchema
>;

export function parsePlanKeyFromSubscriptionName(
  name: string,
): BillingPlanKey | typeof APPIFY_BUNDLES | null {
  if (isVolumeSubscription(name)) return APPIFY_BUNDLES;
  return canonicalizePlanKey(name);
}

export function parsePlanKeyFromSubscription(subscription: {
  name?: string | null;
  plan_handle?: string | null;
}): BillingPlanKey | typeof APPIFY_BUNDLES | null {
  return (
    parsePlanKeyFromSubscriptionName(subscription.name ?? "") ??
    parsePlanKeyFromSubscriptionName(subscription.plan_handle ?? "")
  );
}

export function isActiveSubscriptionStatus(
  status: AppSubscriptionStatus,
): boolean {
  return status === "ACTIVE";
}

export function isInactiveSubscriptionStatus(
  status: AppSubscriptionStatus,
): boolean {
  return status === "CANCELLED" || status === "EXPIRED" || status === "DECLINED";
}
