import type { ActionFunctionArgs } from "react-router";
import {
  customersDataRequestSchema,
  orderIdsFromCompliancePayload,
} from "../schemas/compliance-webhook.schema";
import { authenticateWebhook } from "../services/webhook-auth.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic, payload } = await authenticateWebhook(request);
  console.log(`Received ${topic} webhook for ${shop}`);

  const parsed = customersDataRequestSchema.safeParse(payload);
  if (!parsed.success) {
    console.error(
      `[customers/data_request] Invalid payload for ${shop}:`,
      parsed.error.flatten(),
    );
    return new Response();
  }

  const orderIds = orderIdsFromCompliancePayload(parsed.data);
  console.log(
    `[customers/data_request] ${shop} requested ${orderIds.length} order id(s). Appify Bundles stores order IDs only, not customer PII.`,
  );

  return new Response();
};
