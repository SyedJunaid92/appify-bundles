import prisma from "../db.server";
import { bumpCacheVersion } from "./redis.server";
import { orderIdsFromCompliancePayload } from "../schemas/compliance-webhook.schema";

export async function invalidateShopCaches(shop: string) {
  await Promise.all([
    bumpCacheVersion("billing", shop),
    bumpCacheVersion("analytics", shop),
  ]);
}

export async function markShopUninstalled(shop: string) {
  await prisma.session.deleteMany({ where: { shop } });
  await prisma.shopBilling.updateMany({
    where: { shop },
    data: {
      activePlan: null,
      shopifySubscriptionId: null,
      subscriptionStatus: "CANCELLED",
    },
  });
  await invalidateShopCaches(shop);
}

export async function deleteShopData(shop: string) {
  await prisma.$transaction([
    prisma.session.deleteMany({ where: { shop } }),
    prisma.bundleExperiment.deleteMany({ where: { shop } }),
    prisma.bundleAnalyticsEvent.deleteMany({ where: { shop } }),
    prisma.bundleDailyStat.deleteMany({ where: { shop } }),
    prisma.shopDailyStat.deleteMany({ where: { shop } }),
    prisma.orderEvent.deleteMany({ where: { shop } }),
    prisma.bundle.deleteMany({ where: { shop } }),
    prisma.shopSettings.deleteMany({ where: { shop } }),
    prisma.shopBilling.deleteMany({ where: { shop } }),
    prisma.shopProfile.deleteMany({ where: { shop } }),
  ]);
  await invalidateShopCaches(shop);
}

export async function redactCustomerOrders(shop: string, payload: unknown) {
  const orderIds = orderIdsFromCompliancePayload(payload);
  if (orderIds.length === 0) return { deletedOrders: 0, deletedEvents: 0 };

  const [orders, events] = await prisma.$transaction([
    prisma.orderEvent.deleteMany({
      where: { shop, orderId: { in: orderIds } },
    }),
    prisma.bundleAnalyticsEvent.deleteMany({
      where: {
        shop,
        OR: orderIds.map((orderId) => ({
          metadata: { path: ["orderId"], equals: orderId },
        })),
      },
    }),
  ]);

  await invalidateShopCaches(shop);
  return { deletedOrders: orders.count, deletedEvents: events.count };
}
