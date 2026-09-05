import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { appSubscriptionWebhookSchema } from "../schemas/subscription-webhook.schema";
import { syncSubscriptionFromWebhook } from "../services/subscription-webhook.server";
import { finishWebhookWork } from "../services/webhook-defer.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic, payload } = await authenticate.webhook(request);
  console.log(`Received ${topic} webhook for ${shop}`);

  const parsed = appSubscriptionWebhookSchema.safeParse(payload);
  if (!parsed.success) {
    console.error(
      `[app_subscriptions/update] Invalid payload for ${shop}:`,
      parsed.error.flatten(),
    );
    return new Response();
  }

  await finishWebhookWork(syncSubscriptionFromWebhook(shop, parsed.data));
  return new Response();
};
