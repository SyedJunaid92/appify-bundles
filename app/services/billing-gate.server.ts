import { redirect } from "react-router";
import {
  APPIFY_BUNDLES,
  SHOPIFY_BILLING_PLAN_KEYS,
  isVolumeSubscription,
} from "../constants/billing";
import { authenticate } from "../shopify.server";
import { isShopBillingTestMode } from "./billing-mode.server";
import {
  appendEmbedSearchParams,
  billingErrorMessage,
  confirmationUrlFromBillingResponse,
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

  const started = await startVolumeBilling(request, billing, isTest, shop);
  if (started.confirmationUrl || started.error) {
    throw redirect(appendEmbedSearchParams("/app/billing", url.search));
  }

  return { hasPaidPlan: false, isTest };
}

export async function startVolumeBilling(
  request: Request,
  billing: AdminBilling,
  isTest: boolean,
  shop?: string,
): Promise<{ confirmationUrl?: string; error?: string }> {
  try {
    throw await billing.request({
      plan: APPIFY_BUNDLES,
      isTest,
      returnUrl: volumeBillingReturnUrl(request, shop),
    });
  } catch (error) {
    const confirmationUrl = confirmationUrlFromBillingResponse(error);
    if (confirmationUrl) {
      if (!request.headers.get("authorization")) {
        throw error;
      }
      return { confirmationUrl };
    }
    if (error instanceof Response) throw error;
    return { error: billingErrorMessage(error) };
  }
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
    return { hasPaidPlan, isTest, confirmationUrl: undefined, error: undefined };
  }

  const started = await startVolumeBilling(request, billing, isTest, shop);
  return { hasPaidPlan, isTest, ...started };
}
