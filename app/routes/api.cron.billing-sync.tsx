import type { LoaderFunctionArgs } from "react-router";
import { syncBillingForAllShops } from "../services/billing-sync.server";

function isAuthorizedCron(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;

  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${cronSecret}`;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  if (!isAuthorizedCron(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = await syncBillingForAllShops();

  return Response.json({
    success: true,
    synced: results.length,
    results,
    timestamp: new Date().toISOString(),
  });
};

export const action = loader;
