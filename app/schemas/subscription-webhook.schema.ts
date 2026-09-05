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
  app_subscription: z.object({
    admin_graphql_api_id: z.string(),
    name: z.string(),
    status: z.enum(APP_SUBSCRIPTION_STATUSES),
    admin_graphql_api_shop_id: z.string().optional(),
    created_at: z.string(),
    updated_at: z.string(),
    currency: z.string().optional(),
    capped_amount: z.string().optional(),
    price: z.string().optional(),
    interval: z.string().optional(),
    plan_handle: z.string().optional(),
  }),
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
