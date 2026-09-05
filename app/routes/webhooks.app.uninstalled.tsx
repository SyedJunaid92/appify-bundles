import type { ActionFunctionArgs } from "react-router";
import { finishWebhookWork } from "../services/webhook-defer.server";
import { markShopUninstalled } from "../services/shop-cleanup.server";
import { authenticateWebhook } from "../services/webhook-auth.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic } = await authenticateWebhook(request);
  console.log(`Received ${topic} webhook for ${shop}`);

  await finishWebhookWork(markShopUninstalled(shop));
  return new Response();
};
