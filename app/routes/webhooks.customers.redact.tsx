import type { ActionFunctionArgs } from "react-router";
import { customersRedactSchema } from "../schemas/compliance-webhook.schema";
import { finishWebhookWork } from "../services/webhook-defer.server";
import { redactCustomerOrders } from "../services/shop-cleanup.server";
import { authenticateWebhook } from "../services/webhook-auth.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic, payload } = await authenticateWebhook(request);
  console.log(`Received ${topic} webhook for ${shop}`);

  const parsed = customersRedactSchema.safeParse(payload);
  if (!parsed.success) {
    console.error(
      `[customers/redact] Invalid payload for ${shop}:`,
      parsed.error.flatten(),
    );
    return new Response();
  }

  await finishWebhookWork(redactCustomerOrders(shop, parsed.data));
  return new Response();
};
