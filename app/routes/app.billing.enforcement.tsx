import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { selectPlanSchema } from "../schemas/billing.schema";
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
    const parsed = selectPlanSchema.safeParse({ plan: form.get("plan") });
    if (!parsed.success) {
      return { error: "Invalid plan selected." };
    }

    await setActivePlan(session.shop, parsed.data.plan);
    return billing.request({
      plan: parsed.data.plan,
      isTest,
    });
  }

  return { error: "Unknown intent." };
};
