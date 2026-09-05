import type { LoaderFunctionArgs } from "react-router";
import prisma from "../db.server";
import { unauthenticated } from "../shopify.server";
import { syncActiveOffersToDiscount } from "../services/shopify-sync.server";

function isAuthorizedCron(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;
  return request.headers.get("authorization") === `Bearer ${cronSecret}`;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  if (!isAuthorizedCron(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const shops = await prisma.session.findMany({
    distinct: ["shop"],
    select: { shop: true },
  });

  const results = [];
  for (const row of shops) {
    try {
      const { admin } = await unauthenticated.admin(row.shop);
      const synced = await syncActiveOffersToDiscount(admin, row.shop);
      results.push({ shop: row.shop, ...synced });
    } catch (error) {
      results.push({
        shop: row.shop,
        synced: false,
        error: error instanceof Error ? error.message : "sync failed",
      });
    }
  }

  return Response.json({
    success: true,
    shops: results.length,
    results,
    timestamp: new Date().toISOString(),
  });
};

export const action = loader;
