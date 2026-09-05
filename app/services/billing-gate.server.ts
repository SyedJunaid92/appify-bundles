import {
  APPIFY_BUNDLES,
  SHOPIFY_BILLING_PLAN_KEYS,
  isVolumeSubscription,
} from "../constants/billing";
import { authenticate } from "../shopify.server";
import { isShopBillingTestMode } from "./billing-mode.server";
import {
  isBillingGateExempt,
  isBillingReturn,
  shouldAutoApproveBilling,
  volumeBillingReturnUrl,
} from "../utils/embedded-app";

type AdminContext = Awaited<ReturnType<typeof authenticate.admin>>;
type AdminBilling = AdminContext["billing"];
type AdminGraphql = AdminContext["admin"];

export async function checkVolumeBilling(
  billing: AdminBilling,
  admin: AdminGraphql,
  shop: string,
) {
  const isTest = await isShopBillingTestMode(admin);
  const billingCheck = await billing.check({
    plans: [...SHOPIFY_BILLING_PLAN_KEYS],
    isTest,
  });
  const shopifyPlanName = billingCheck.appSubscriptions[0]?.name;
  const hasPaidPlan =
    billingCheck.hasActivePayment || isVolumeSubscription(shopifyPlanName);

  return { isTest, billingCheck, hasPaidPlan };
}

export async function enforceVolumeBillingGate(
  request: Request,
  billing: AdminBilling,
  admin: AdminGraphql,
  shop: string,
): Promise<{ hasPaidPlan: boolean; isTest: boolean }> {
  const url = new URL(request.url);
  const { isTest, hasPaidPlan } = await checkVolumeBilling(billing, admin, shop);

  if (hasPaidPlan || isBillingReturn(url)) {
    return { hasPaidPlan: hasPaidPlan || isBillingReturn(url), isTest };
  }

  if (isBillingGateExempt(url.pathname)) {
    return { hasPaidPlan: false, isTest };
  }

  throw await billing.request({
    plan: APPIFY_BUNDLES,
    isTest,
    returnUrl: volumeBillingReturnUrl(request),
  });
}

export async function requestVolumeBillingIfNeeded(
  request: Request,
  billing: AdminBilling,
  admin: AdminGraphql,
  shop: string,
) {
  const url = new URL(request.url);
  const { isTest, hasPaidPlan } = await checkVolumeBilling(billing, admin, shop);
  if (hasPaidPlan || !shouldAutoApproveBilling(url)) {
    return { hasPaidPlan, isTest };
  }

  throw await billing.request({
    plan: APPIFY_BUNDLES,
    isTest,
    returnUrl: volumeBillingReturnUrl(request),
  });
}
