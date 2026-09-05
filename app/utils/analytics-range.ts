import type { AnalyticsFilters } from "../schemas/analytics.schema";
import { clampRange, parseDateKey, utcDayDate } from "./daily-stats";

const PERIOD_DAYS: Record<"7d" | "30d" | "90d", number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

export function resolveAnalyticsRange(filters: AnalyticsFilters): {
  start: Date;
  end: Date;
  period: AnalyticsFilters["period"];
} {
  const today = utcDayDate();

  if (filters.period === "custom" && filters.from && filters.to) {
    return {
      ...clampRange(parseDateKey(filters.from), parseDateKey(filters.to)),
      period: "custom",
    };
  }

  const period =
    filters.period === "custom" ? "30d" : (filters.period as "7d" | "30d" | "90d");
  const days = PERIOD_DAYS[period];
  const start = utcDayDate(today);
  start.setUTCDate(start.getUTCDate() - days + 1);
  return { start, end: today, period };
}

export function analyticsCacheKey(shop: string, version: number, filters: AnalyticsFilters) {
  return [
    "analytics:dash",
    shop,
    version,
    filters.period,
    filters.from ?? "",
    filters.to ?? "",
    filters.bundleId ?? "",
    filters.eventType ?? "",
    filters.status,
  ].join(":");
}
