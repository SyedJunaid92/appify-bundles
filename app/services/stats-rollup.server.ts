import { Prisma } from "@prisma/client";
import prisma from "../db.server";
import {
  addCounters,
  EMPTY_DAILY_COUNTERS,
  parseDateKey,
  utcDayDate,
  type DailyCounters,
} from "../utils/daily-stats";
import {
  getMerchantSnapshot,
  fillBundleDailyIfMissing,
  fillShopDailyIfMissing,
  upsertShopProfile,
} from "../models/daily-stats.server";
import { bumpCacheVersion } from "./redis.server";

interface RawEventRow {
  shop: string;
  bundleId: string | null;
  eventType: string;
  statDate: Date | string;
  count: number;
  revenue: Prisma.Decimal | number | string;
}

interface RawOrderRow {
  shop: string;
  statDate: Date | string;
  count: number;
}

export async function rollupShopStats(shop: string, since: Date) {
  const [eventRows, orderRows] = await Promise.all([
    prisma.$queryRaw<RawEventRow[]>(Prisma.sql`
      SELECT
        shop,
        "bundleId",
        "eventType",
        (("createdAt" AT TIME ZONE 'UTC')::date) AS "statDate",
        COUNT(*)::int AS count,
        COALESCE(SUM(revenue), 0) AS revenue
      FROM "BundleAnalyticsEvent"
      WHERE shop = ${shop} AND "createdAt" >= ${since}
      GROUP BY 1, 2, 3, 4
    `),
    prisma.$queryRaw<RawOrderRow[]>(Prisma.sql`
      SELECT
        shop,
        (("createdAt" AT TIME ZONE 'UTC')::date) AS "statDate",
        COUNT(*)::int AS count
      FROM "OrderEvent"
      WHERE shop = ${shop} AND "createdAt" >= ${since}
      GROUP BY 1, 2
    `),
  ]);

  return writeRollupRows(eventRows, orderRows, { syncProfiles: false });
}

export async function ensureShopDailyStats(shop: string, since: Date) {
  const existing = await prisma.shopDailyStat.findFirst({
    where: { shop, statDate: { gte: utcDayDate(since) } },
    select: { id: true },
  });
  if (existing) return { backfilled: false };

  const [events, orders] = await Promise.all([
    prisma.bundleAnalyticsEvent.count({
      where: { shop, createdAt: { gte: since } },
    }),
    prisma.orderEvent.count({
      where: { shop, createdAt: { gte: since } },
    }),
  ]);
  if (events === 0 && orders === 0) return { backfilled: false };

  await rollupShopStats(shop, since);
  return { backfilled: true };
}

export async function rollupRecentStats(options?: { hours?: number }) {
  const existing = await prisma.shopDailyStat.count();
  const hours = options?.hours ?? (existing === 0 ? 90 * 24 : 48);
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  const [eventRows, orderRows] = await Promise.all([
    prisma.$queryRaw<RawEventRow[]>(Prisma.sql`
      SELECT
        shop,
        "bundleId",
        "eventType",
        (("createdAt" AT TIME ZONE 'UTC')::date) AS "statDate",
        COUNT(*)::int AS count,
        COALESCE(SUM(revenue), 0) AS revenue
      FROM "BundleAnalyticsEvent"
      WHERE "createdAt" >= ${since}
      GROUP BY 1, 2, 3, 4
    `),
    prisma.$queryRaw<RawOrderRow[]>(Prisma.sql`
      SELECT
        shop,
        (("createdAt" AT TIME ZONE 'UTC')::date) AS "statDate",
        COUNT(*)::int AS count
      FROM "OrderEvent"
      WHERE "createdAt" >= ${since}
      GROUP BY 1, 2
    `),
  ]);

  return writeRollupRows(eventRows, orderRows, { hours, syncProfiles: true });
}

async function writeRollupRows(
  eventRows: RawEventRow[],
  orderRows: RawOrderRow[],
  options: { hours?: number; syncProfiles?: boolean } = {},
) {
  const shopDays = new Map<string, DailyCounters>();
  const bundleDays = new Map<string, DailyCounters>();
  const shops = new Set<string>();

  for (const row of eventRows) {
    const day = toDateKey(row.statDate);
    const shopKey = `${row.shop}|${day}`;
    shops.add(row.shop);
    const extra = countersFromRawEvent(row);
    shopDays.set(shopKey, addCounters(shopDays.get(shopKey) ?? { ...EMPTY_DAILY_COUNTERS }, extra));

    if (row.bundleId) {
      const bundleKey = `${row.shop}|${row.bundleId}|${day}`;
      bundleDays.set(
        bundleKey,
        addCounters(bundleDays.get(bundleKey) ?? { ...EMPTY_DAILY_COUNTERS }, extra),
      );
    }
  }

  for (const row of orderRows) {
    const day = toDateKey(row.statDate);
    const shopKey = `${row.shop}|${day}`;
    shops.add(row.shop);
    const current = shopDays.get(shopKey) ?? { ...EMPTY_DAILY_COUNTERS };
    current.orders = row.count;
    shopDays.set(shopKey, current);
  }

  if (options.syncProfiles) {
    await syncShopProfilesFromSessions();
  }

  for (const shop of shops) {
    const merchant = await getMerchantSnapshot(shop);
    await bumpCacheVersion("analytics", shop);
    await bumpCacheVersion("billing", shop);

    for (const [key, counters] of shopDays) {
      if (!key.startsWith(`${shop}|`)) continue;
      const day = parseDateKey(key.slice(shop.length + 1));
      await fillShopDailyIfMissing(shop, day, counters, merchant);
    }
  }

  for (const [key, counters] of bundleDays) {
    const [shop, bundleId, day] = key.split("|");
    await fillBundleDailyIfMissing(shop, bundleId, parseDateKey(day), counters);
  }

  return {
    hours: options.hours,
    shops: shops.size,
    shopDays: shopDays.size,
    bundleDays: bundleDays.size,
  };
}

export async function syncShopProfilesFromSessions() {
  const sessions = await prisma.session.findMany({
    distinct: ["shop"],
    select: {
      shop: true,
      email: true,
      firstName: true,
      lastName: true,
    },
  });

  for (const session of sessions) {
    const name =
      [session.firstName, session.lastName].filter(Boolean).join(" ") || null;
    await upsertShopProfile(session.shop, {
      name,
      email: session.email,
    });
  }

  return sessions.length;
}

function countersFromRawEvent(row: RawEventRow): DailyCounters {
  const count = Number(row.count);
  const revenue = Number(row.revenue ?? 0);
  const next = { ...EMPTY_DAILY_COUNTERS };

  switch (row.eventType) {
    case "view":
      next.views = count;
      break;
    case "impression":
      next.impressions = count;
      break;
    case "click":
      next.clicks = count;
      break;
    case "add_to_cart":
      next.addToCart = count;
      break;
    case "purchase":
      next.purchases = count;
      next.revenue = revenue;
      break;
  }

  return next;
}

function toDateKey(value: Date | string): string {
  if (value instanceof Date) return utcDayDate(value).toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}
