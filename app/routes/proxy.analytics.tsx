import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { trackEventSchema } from "../schemas/analytics.schema";
import { trackStorefrontEvent } from "../services/analytics.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const { session } = await authenticate.public.appProxy(request);

  if (!session?.shop) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = trackEventSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid event data", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  await trackStorefrontEvent(session.shop, parsed.data);

  return Response.json({ success: true });
};
