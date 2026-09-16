import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { pauseBundlesForTierLimit } from "../services/billing-enforcement.server";
import {
  startVolumeBilling,
  volumeBillingApprovalUrl,
} from "../services/billing-gate.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, redirect } = await authenticate.admin(request);
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");

  if (intent === "dismiss") {
    const pausedCount = await pauseBundlesForTierLimit(session.shop);
    return { ok: true, intent: "dismiss", pausedCount };
  }

  if (intent === "upgrade") {
    const started = await startVolumeBilling(request, session.shop);
    const pricingPlansUrl =
      started.confirmationUrl || volumeBillingApprovalUrl(request, session.shop);
    if (pricingPlansUrl) {
      return redirect(pricingPlansUrl, { target: "_top" });
    }
    return {
      error:
        started.error ??
        "Shopify could not open the plan page. Try billing again.",
    };
  }

  return { error: "Unknown intent." };
};
