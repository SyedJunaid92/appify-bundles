import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { finishWebhookWork } from "../services/webhook-defer.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { payload, session, topic, shop } = await authenticate.webhook(request);
  console.log(`Received ${topic} webhook for ${shop}`);

  const current = payload.current as string[];
  await finishWebhookWork(
    (async () => {
      if (session) {
        await db.session.update({
          where: { id: session.id },
          data: { scope: current.toString() },
        });
      }
    })(),
  );

  return new Response();
};
