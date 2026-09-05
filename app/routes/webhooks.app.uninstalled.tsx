import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { finishWebhookWork } from "../services/webhook-defer.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, session, topic } = await authenticate.webhook(request);
  console.log(`Received ${topic} webhook for ${shop}`);

  await finishWebhookWork(
    (async () => {
      if (session) {
        await db.session.deleteMany({ where: { shop } });
      }

      await db.shopBilling.updateMany({
        where: { shop },
        data: {
          activePlan: null,
          shopifySubscriptionId: null,
          subscriptionStatus: "CANCELLED",
        },
      });
    })(),
  );

  return new Response();
};
