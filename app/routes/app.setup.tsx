import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { dismissSetupGuide } from "../models/bundle.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const form = await request.formData();

  if (form.get("intent") === "dismiss") {
    await dismissSetupGuide(session.shop);
  }

  return { ok: true };
};
