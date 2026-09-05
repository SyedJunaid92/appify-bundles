import type { ActionFunctionArgs } from "react-router";
import { authenticateWebhook } from "../services/webhook-auth.server";
import { incrementOrderCount } from "../models/billing.server";
import { trackBundlePurchasesFromOrder } from "../services/analytics.server";
import { checkTierLimitAfterOrder } from "../services/billing-enforcement.server";
import { finishWebhookWork } from "../services/webhook-defer.server";

interface OrderWebhookPayload {
  id?: number | string;
  total_price?: string;
  currency?: string;
  line_items?: Array<{
    price?: string;
    quantity?: number;
    properties?: Array<{ name: string; value: string }>;
  }>;
}

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic, payload } = await authenticateWebhook(request);
  console.log(`Received ${topic} webhook for ${shop}`);

  await finishWebhookWork(processOrderWebhook(shop, payload as OrderWebhookPayload));
  return new Response();
};

async function processOrderWebhook(shop: string, order: OrderWebhookPayload) {
  const orderId = String(order.id ?? "");
  if (!orderId) return;

  await incrementOrderCount(shop, orderId);
  await checkTierLimitAfterOrder(shop);
  if (order.id != null) {
    await trackBundlePurchasesFromOrder(shop, {
      id: order.id,
      total_price: order.total_price,
      currency: order.currency,
      line_items: order.line_items,
    });
  }
}
