import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { APPIFY_BUNDLES, APPIFY_BUNDLES_HANDLE } from "../constants/billing";
import { setActivePlan } from "../models/billing.server";
import { isShopBillingTestMode } from "../services/billing-mode.server";
import { pauseBundlesForTierLimit } from "../services/billing-enforcement.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { billing, admin, session } = await authenticate.admin(request);
  const isTest = await isShopBillingTestMode(admin);
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");

  if (intent === "dismiss") {
    const pausedCount = await pauseBundlesForTierLimit(session.shop);
    return { ok: true, intent: "dismiss", pausedCount };
  }

  if (intent === "upgrade") {
    await setActivePlan(session.shop, APPIFY_BUNDLES);
    return billing.request({
      plan: APPIFY_BUNDLES_HANDLE,
      isTest,
    });
  }

  return { error: "Unknown intent." };
};
