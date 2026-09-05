import type { ActionFunctionArgs } from "react-router";
import db from "../db.server";
import { finishWebhookWork } from "../services/webhook-defer.server";
import { authenticateWebhook } from "../services/webhook-auth.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { payload, session, topic, shop } = await authenticateWebhook(request);
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
