import { redirect } from "react-router";
import {
  APPIFY_BUNDLES,
  SHOPIFY_BILLING_PLAN_KEYS,
  isStoredSubscriptionActive,
  isVolumeSubscription,
} from "../constants/billing";
import { clearActivePlan, getShopBilling, setActivePlan } from "../models/billing.server";
import { authenticate } from "../shopify.server";
import { isShopBillingTestMode } from "./billing-mode.server";
import {
  fetchActiveSubscription,
  isPartnerApiConfigured,
} from "./partner-api.server";
import {
  appendEmbedSearchParams,
  isBillingGateExempt,
  isBillingReturn,
  shopHandleFromRequest,
  shopifyAppPricingPlansUrl,
} from "../utils/embedded-app";

type AdminContext = Awaited<ReturnType<typeof authenticate.admin>>;
type AdminBilling = AdminContext["billing"];
type AdminGraphql = AdminContext["admin"];

const BILLING_STATUS_QUERY = `#graphql
  query AppifyBillingStatus {
    shop { id }
    currentAppInstallation {
      activeSubscriptions {
        id
        name
        status
        test
      }
    }
  }
`;

type BillingCheckResult = Awaited<ReturnType<AdminBilling["check"]>>;

export async function rememberPlanHandleFromRequest(
  request: Request,
  shop: string,
) {
  const planHandle = new URL(request.url).searchParams.get("plan_handle");
  if (!planHandle) return null;
  const planKey = isVolumeSubscription(planHandle)
    ? APPIFY_BUNDLES
    : planHandle;
  await setActivePlan(shop, planKey);
  return planKey;
}

async function fetchAdminBillingStatus(admin: AdminGraphql) {
  try {
    const response = await admin.graphql(BILLING_STATUS_QUERY);
    const payload = (await response.json()) as {
      data?: {
        shop?: { id?: string };
        currentAppInstallation?: {
          activeSubscriptions?: Array<{
            id?: string;
            name?: string;
            status?: string;
            test?: boolean;
          }>;
        };
      };
    };
    return {
      shopId: payload.data?.shop?.id ?? null,
      subscriptions: payload.data?.currentAppInstallation?.activeSubscriptions ?? [],
    };
  } catch {
    return { shopId: null, subscriptions: [] };
  }
}

export async function checkVolumeBilling(
  billing: AdminBilling,
  admin: AdminGraphql,
  shop: string,
) {
  const isTest = await isShopBillingTestMode(admin);
  const status = await fetchAdminBillingStatus(admin);
  const liveSubscriptions = status.subscriptions.filter(
    (subscription) => !subscription.status || subscription.status === "ACTIVE",
  );
  const hasAdminSubscription = liveSubscriptions.length > 0;

  let billingCheck: BillingCheckResult | null = null;
  try {
    billingCheck = await billing.check({
      plans: [...SHOPIFY_BILLING_PLAN_KEYS],
      isTest,
    });
  } catch {
    billingCheck = null;
  }

  const shopifyPlanName =
    billingCheck?.appSubscriptions[0]?.name || liveSubscriptions[0]?.name;
  let hasPaidPlan =
    hasAdminSubscription ||
    Boolean(billingCheck?.hasActivePayment) ||
    isVolumeSubscription(shopifyPlanName);

  let partnerConfirmedUnpaid = false;
  if (!hasPaidPlan && isPartnerApiConfigured() && status.shopId) {
    try {
      hasPaidPlan = Boolean(await fetchActiveSubscription(status.shopId));
      partnerConfirmedUnpaid = !hasPaidPlan;
    } catch (error) {
      console.error("[billing] Partner API activeSubscription failed", shop, error);
    }
  }

  if (partnerConfirmedUnpaid) {
    await clearActivePlan(shop);
    return { isTest, billingCheck, hasPaidPlan: false };
  }

  if (!hasPaidPlan) {
    const record = await getShopBilling(shop);
    hasPaidPlan = isStoredSubscriptionActive(
      record?.activePlan,
      record?.subscriptionStatus,
    );
  }

  return { isTest, billingCheck, hasPaidPlan };
}

export async function enforceVolumeBillingGate(
  request: Request,
  billing: AdminBilling,
  admin: AdminGraphql,
  shop: string,
): Promise<{ hasPaidPlan: boolean; isTest: boolean }> {
  const url = new URL(request.url);
  if (url.searchParams.get("plan_handle")) {
    await rememberPlanHandleFromRequest(request, shop);
  }

  const { isTest, hasPaidPlan } = await checkVolumeBilling(billing, admin, shop);

  if (hasPaidPlan || isBillingReturn(url)) {
    return { hasPaidPlan: true, isTest };
  }

  if (isBillingGateExempt(url.pathname)) {
    return { hasPaidPlan: false, isTest };
  }

  throw redirect(appendEmbedSearchParams("/app/billing", url.search));
}

export function volumeBillingApprovalUrl(
  request: Request,
  shop?: string,
): string | null {
  const storeHandle = shopHandleFromRequest(request, shop);
  if (!storeHandle) return null;
  return shopifyAppPricingPlansUrl(storeHandle);
}

export async function startVolumeBilling(
  request: Request,
  shop?: string,
): Promise<{ confirmationUrl?: string; error?: string }> {
  const confirmationUrl = volumeBillingApprovalUrl(request, shop);
  if (!confirmationUrl) {
    return {
      error:
        "Could not open Shopify billing for this shop. Reload the app and try Approve on Shopify again.",
    };
  }
  return { confirmationUrl };
}

export async function requestVolumeBillingIfNeeded(
  request: Request,
  billing: AdminBilling,
  admin: AdminGraphql,
  shop: string,
) {
  const { isTest, hasPaidPlan } = await checkVolumeBilling(billing, admin, shop);
  if (hasPaidPlan) {
    return { hasPaidPlan, isTest, confirmationUrl: undefined, error: undefined };
  }

  const started = await startVolumeBilling(request, shop);
  return { hasPaidPlan, isTest, ...started };
}
