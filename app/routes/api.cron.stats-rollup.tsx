import type { LoaderFunctionArgs } from "react-router";
import { rollupRecentStats } from "../services/stats-rollup.server";

function isAuthorizedCron(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;
  return request.headers.get("authorization") === `Bearer ${cronSecret}`;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  if (!isAuthorizedCron(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await rollupRecentStats();

  return Response.json({
    success: true,
    ...result,
    timestamp: new Date().toISOString(),
  });
};

export const action = loader;
