import prisma from "../db.server";
import type { AnalyticsEventType } from "../schemas/analytics.schema";
import {
  bumpCacheVersion,
  cacheGet,
  cacheSet,
} from "../services/redis.server";
import {
  countersForEvent,
  utcDayDate,
  type DailyCounters,
} from "../utils/daily-stats";

export interface MerchantSnapshot {
  shop: string;
  name: string | null;
  email: string | null;
  currency: string;
}

const PROFILE_TTL_SECONDS = 60 * 60;

export async function getMerchantSnapshot(shop: string): Promise<MerchantSnapshot> {
  const cacheKey = `shop:profile:${shop}`;
  const cached = await cacheGet<MerchantSnapshot>(cacheKey);
  if (cached) return cached;

  const [profile, session] = await Promise.all([
    prisma.shopProfile.findUnique({ where: { shop } }),
    prisma.session.findFirst({
      where: { shop },
      select: { email: true, firstName: true, lastName: true },
      orderBy: { id: "asc" },
    }),
  ]);

  const sessionName = [session?.firstName, session?.lastName]
    .filter(Boolean)
    .join(" ");
  const name = profile?.name ?? (sessionName || null);

  const snapshot: MerchantSnapshot = {
    shop,
    name,
    email: profile?.email ?? session?.email ?? null,
    currency: profile?.currency ?? "USD",
  };

  await cacheSet(cacheKey, snapshot, PROFILE_TTL_SECONDS);
  return snapshot;
}

export async function upsertShopProfile(
  shop: string,
  data: Partial<Omit<MerchantSnapshot, "shop">>,
) {
  const record = await prisma.shopProfile.upsert({
    where: { shop },
    create: {
      shop,
      name: data.name,
      email: data.email,
      currency: data.currency ?? "USD",
    },
    update: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.email !== undefined ? { email: data.email } : {}),
      ...(data.currency !== undefined ? { currency: data.currency } : {}),
    },
  });

  await cacheSet(
    `shop:profile:${shop}`,
    {
      shop,
      name: record.name,
      email: record.email,
      currency: record.currency,
    } satisfies MerchantSnapshot,
    PROFILE_TTL_SECONDS,
  );

  return record;
}

const HIGH_VOLUME_EVENTS = new Set(["view", "impression", "click"]);

export async function incrementDailyFromEvent(options: {
  shop: string;
  bundleId?: string | null;
  eventType: AnalyticsEventType | "order";
  revenue?: number;
  at?: Date;
}) {
  const day = utcDayDate(options.at ?? new Date());
  const delta = countersForEvent(options.eventType, options.revenue);

  await Promise.all([
    incrementShopDaily(options.shop, day, delta),
    options.bundleId
      ? incrementBundleDaily(options.shop, options.bundleId, day, delta)
      : Promise.resolve(),
  ]);

  if (!HIGH_VOLUME_EVENTS.has(options.eventType)) {
    await Promise.all([
      bumpCacheVersion("analytics", options.shop),
      options.eventType === "order"
        ? bumpCacheVersion("billing", options.shop)
        : Promise.resolve(),
    ]);
  }
}

export async function incrementShopDaily(
  shop: string,
  day: Date,
  delta: DailyCounters,
  merchant?: MerchantSnapshot,
) {
  const update = incrementPayload(delta);
  const existing = await prisma.shopDailyStat.updateMany({
    where: { shop, statDate: day },
    data: update,
  });
  if (existing.count > 0) return;

  const snapshot = merchant ?? (await getMerchantSnapshot(shop));
  try {
    await prisma.shopDailyStat.create({
      data: {
        shop,
        statDate: day,
        shopName: snapshot.name,
        email: snapshot.email,
        currency: snapshot.currency,
        ...delta,
      },
    });
  } catch {
    await prisma.shopDailyStat.update({
      where: { shop_statDate: { shop, statDate: day } },
      data: update,
    });
  }
}

export async function incrementBundleDaily(
  shop: string,
  bundleId: string,
  day: Date,
  delta: DailyCounters,
) {
  const update = incrementPayload(delta);
  const existing = await prisma.bundleDailyStat.updateMany({
    where: { shop, bundleId, statDate: day },
    data: update,
  });
  if (existing.count > 0) return;

  try {
    await prisma.bundleDailyStat.create({
      data: {
        shop,
        bundleId,
        statDate: day,
        views: delta.views,
        impressions: delta.impressions,
        clicks: delta.clicks,
        addToCart: delta.addToCart,
        purchases: delta.purchases,
        revenue: delta.revenue,
      },
    });
  } catch {
    await prisma.bundleDailyStat.update({
      where: {
        shop_bundleId_statDate: { shop, bundleId, statDate: day },
      },
      data: update,
    });
  }
}

export async function fillShopDailyIfMissing(
  shop: string,
  day: Date,
  counters: DailyCounters,
  merchant?: MerchantSnapshot,
) {
  await prisma.shopDailyStat.upsert({
    where: { shop_statDate: { shop, statDate: day } },
    create: {
      shop,
      statDate: day,
      shopName: merchant?.name,
      email: merchant?.email,
      currency: merchant?.currency ?? "USD",
      ...counters,
    },
    update: {},
  });
}

export async function fillBundleDailyIfMissing(
  shop: string,
  bundleId: string,
  day: Date,
  counters: DailyCounters,
) {
  await prisma.bundleDailyStat.upsert({
    where: {
      shop_bundleId_statDate: { shop, bundleId, statDate: day },
    },
    create: {
      shop,
      bundleId,
      statDate: day,
      views: counters.views,
      impressions: counters.impressions,
      clicks: counters.clicks,
      addToCart: counters.addToCart,
      purchases: counters.purchases,
      revenue: counters.revenue,
    },
    update: {},
  });
}

function incrementPayload(delta: DailyCounters) {
  const update: Record<string, { increment: number }> = {};
  if (delta.views) update.views = { increment: delta.views };
  if (delta.impressions) update.impressions = { increment: delta.impressions };
  if (delta.clicks) update.clicks = { increment: delta.clicks };
  if (delta.addToCart) update.addToCart = { increment: delta.addToCart };
  if (delta.purchases) update.purchases = { increment: delta.purchases };
  if (delta.revenue) update.revenue = { increment: delta.revenue };
  if (delta.orders) update.orders = { increment: delta.orders };
  return update;
}
