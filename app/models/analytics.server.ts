import prisma from "../db.server";
import type { Prisma } from "@prisma/client";
import type {
  AnalyticsEventType,
  AnalyticsFilters,
  AnalyticsPeriod,
} from "../schemas/analytics.schema";
import { cachedJson, readCacheVersion } from "../services/redis.server";
import { incrementDailyFromEvent } from "./daily-stats.server";
import { ensureShopDailyStats } from "../services/stats-rollup.server";
import { analyticsCacheKey, resolveAnalyticsRange } from "../utils/analytics-range";
import {
  dateKey,
  eachDateKey,
  summarizeCounters,
  widgetViews,
  conversionRate,
  type DailyCounters,
} from "../utils/daily-stats";

function asFilters(
  periodOrFilters: AnalyticsPeriod | AnalyticsFilters = "30d",
): AnalyticsFilters {
  if (typeof periodOrFilters === "string") {
    return {
      period: periodOrFilters,
      status: "all",
    };
  }
  return periodOrFilters;
}

export async function recordAnalyticsEvent(
  shop: string,
  data: {
    eventType: AnalyticsEventType;
    bundleId?: string;
    revenue?: number;
    currency?: string;
    metadata?: Record<string, unknown>;
  },
) {
  const highVolume =
    data.eventType === "view" ||
    data.eventType === "impression" ||
    data.eventType === "click";

  try {
    await incrementDailyFromEvent({
      shop,
      bundleId: data.bundleId,
      eventType: data.eventType,
      revenue: data.revenue,
    });
  } catch (error) {
    console.error("[daily-stats] increment failed", shop, error);
  }

  if (highVolume) {
    return { id: "daily", shop, eventType: data.eventType };
  }

  return prisma.bundleAnalyticsEvent.create({
    data: {
      shop,
      eventType: data.eventType,
      bundleId: data.bundleId,
      revenue: data.revenue,
      currency: data.currency ?? "USD",
      metadata: (data.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });
}

export async function getAnalyticsSummary(
  shop: string,
  periodOrFilters: AnalyticsPeriod | AnalyticsFilters = "30d",
) {
  const filters = asFilters(periodOrFilters);
  const { start } = resolveAnalyticsRange(filters);
  try {
    await ensureShopDailyStats(shop, start);
  } catch (error) {
    console.error("[daily-stats] lazy backfill failed", shop, error);
  }
  const rows = await loadFilteredDailyRows(shop, filters);
  return summarizeCounters(rows.map((row) => row.counters));
}

export async function getAnalyticsByBundle(
  shop: string,
  periodOrFilters: AnalyticsPeriod | AnalyticsFilters = "30d",
) {
  const filters = asFilters(periodOrFilters);
  const { start, end } = resolveAnalyticsRange(filters);

  const grouped = await prisma.bundleDailyStat.groupBy({
    by: ["bundleId"],
    where: {
      shop,
      statDate: { gte: start, lte: end },
      ...(filters.bundleId ? { bundleId: filters.bundleId } : {}),
    },
    _sum: {
      views: true,
      impressions: true,
      clicks: true,
      addToCart: true,
      purchases: true,
      revenue: true,
    },
  });

  const bundleIds = grouped.map((row) => row.bundleId);
  const bundles = await prisma.bundle.findMany({
    where: {
      shop,
      id: { in: bundleIds },
      ...(filters.status && filters.status !== "all"
        ? { status: filters.status }
        : {}),
    },
    select: { id: true, title: true, status: true },
  });
  const titleMap = new Map(bundles.map((bundle) => [bundle.id, bundle]));

  return grouped
    .filter((row) => titleMap.has(row.bundleId))
    .map((row) => {
      const views = widgetViews({
        views: row._sum.views ?? 0,
        impressions: row._sum.impressions ?? 0,
      });
      const purchases = row._sum.purchases ?? 0;
      return {
        bundleId: row.bundleId,
        title: titleMap.get(row.bundleId)?.title ?? "Unknown bundle",
        status: titleMap.get(row.bundleId)?.status ?? "unknown",
        views,
        addToCart: row._sum.addToCart ?? 0,
        purchases,
        revenue: Number(row._sum.revenue ?? 0),
        clicks: row._sum.clicks ?? 0,
        conversionRate: conversionRate(views, purchases),
      };
    })
    .filter((row) => matchesEventTypeFilter(row, filters.eventType))
    .sort((a, b) => b.revenue - a.revenue);
}

export async function getAnalyticsDailyTrend(
  shop: string,
  periodOrFilters: AnalyticsPeriod | AnalyticsFilters = "30d",
) {
  const filters = asFilters(periodOrFilters);
  const { start, end } = resolveAnalyticsRange(filters);
  const rows = await loadFilteredDailyRows(shop, filters);
  const byDate = new Map(rows.map((row) => [row.date, row.counters]));

  return eachDateKey(start, end).map((date) => {
    const counters = byDate.get(date) ?? {
      views: 0,
      impressions: 0,
      clicks: 0,
      addToCart: 0,
      purchases: 0,
      revenue: 0,
      orders: 0,
    };
    return {
      date,
      views: widgetViews(counters),
      addToCart: counters.addToCart,
      purchases: counters.purchases,
      revenue: counters.revenue,
      orders: counters.orders,
      clicks: counters.clicks,
    };
  });
}

export async function getAnalyticsDashboard(
  shop: string,
  periodOrFilters: AnalyticsPeriod | AnalyticsFilters = "30d",
) {
  const filters = asFilters(periodOrFilters);
  const version = await readCacheVersion("analytics", shop);
  const cacheKey = analyticsCacheKey(shop, version, filters);

  return cachedJson(cacheKey, 45, () => loadAnalyticsDashboard(shop, filters));
}

async function loadAnalyticsDashboard(shop: string, filters: AnalyticsFilters) {
  const { start } = resolveAnalyticsRange(filters);
  try {
    await ensureShopDailyStats(shop, start);
  } catch (error) {
    console.error("[daily-stats] lazy backfill failed", shop, error);
  }

  const [summary, byBundle, dailyTrend, experiments, bundles] = await Promise.all([
    getAnalyticsSummary(shop, filters),
    getAnalyticsByBundle(shop, filters),
    getAnalyticsDailyTrend(shop, filters),
    prisma.bundleExperiment.findMany({
      where: { shop },
      orderBy: { updatedAt: "desc" },
      take: 10,
    }),
    prisma.bundle.findMany({
      where: { shop },
      select: { id: true, title: true, status: true },
      orderBy: { title: "asc" },
    }),
  ]);

  return {
    summary,
    byBundle,
    dailyTrend,
    period: filters.period === "custom" ? "30d" : filters.period,
    filters,
    experiments,
    bundles,
  };
}

async function loadFilteredDailyRows(shop: string, filters: AnalyticsFilters) {
  const { start, end } = resolveAnalyticsRange(filters);
  const bundleIds = await resolveBundleIds(shop, filters);

  if (bundleIds || filters.bundleId) {
    const rows = await prisma.bundleDailyStat.findMany({
      where: {
        shop,
        statDate: { gte: start, lte: end },
        ...(bundleIds ? { bundleId: { in: bundleIds } } : {}),
      },
    });
    return mergeRowsByDate(rows);
  }

  const rows = await prisma.shopDailyStat.findMany({
    where: { shop, statDate: { gte: start, lte: end } },
  });

  return rows.map((row) => ({
    date: dateKey(row.statDate),
    counters: toCounters(row),
  }));
}

async function resolveBundleIds(shop: string, filters: AnalyticsFilters) {
  if (filters.bundleId) return [filters.bundleId];
  if (!filters.status || filters.status === "all") return null;

  const bundles = await prisma.bundle.findMany({
    where: { shop, status: filters.status },
    select: { id: true },
  });
  return bundles.map((bundle) => bundle.id);
}

function mergeRowsByDate(
  rows: Array<{
    statDate: Date;
    views: number;
    impressions: number;
    clicks: number;
    addToCart: number;
    purchases: number;
    revenue: unknown;
  }>,
) {
  const map = new Map<string, DailyCounters>();
  for (const row of rows) {
    const key = dateKey(row.statDate);
    const current = map.get(key) ?? {
      views: 0,
      impressions: 0,
      clicks: 0,
      addToCart: 0,
      purchases: 0,
      revenue: 0,
      orders: 0,
    };
    current.views += row.views;
    current.impressions += row.impressions;
    current.clicks += row.clicks;
    current.addToCart += row.addToCart;
    current.purchases += row.purchases;
    current.revenue += Number(row.revenue ?? 0);
    map.set(key, current);
  }
  return [...map.entries()].map(([date, counters]) => ({ date, counters }));
}

function toCounters(row: {
  views: number;
  impressions: number;
  clicks: number;
  addToCart: number;
  purchases: number;
  revenue: unknown;
  orders?: number;
}): DailyCounters {
  return {
    views: row.views,
    impressions: row.impressions,
    clicks: row.clicks,
    addToCart: row.addToCart,
    purchases: row.purchases,
    revenue: Number(row.revenue ?? 0),
    orders: row.orders ?? 0,
  };
}

function matchesEventTypeFilter(
  row: { views: number; addToCart: number; purchases: number; clicks: number },
  eventType?: AnalyticsEventType,
) {
  if (!eventType) return true;
  if (eventType === "view" || eventType === "impression") return row.views > 0;
  if (eventType === "add_to_cart") return row.addToCart > 0;
  if (eventType === "purchase") return row.purchases > 0;
  if (eventType === "click") return row.clicks > 0;
  return true;
}
