import { z } from "zod";

export const ANALYTICS_EVENT_TYPES = [
  "view",
  "impression",
  "click",
  "add_to_cart",
  "purchase",
] as const;

export type AnalyticsEventType = (typeof ANALYTICS_EVENT_TYPES)[number];

export const ANALYTICS_PERIODS = ["7d", "30d", "90d", "custom"] as const;

export const trackEventSchema = z.object({
  eventType: z.enum(ANALYTICS_EVENT_TYPES),
  bundleId: z.string().optional(),
  revenue: z.number().min(0).optional(),
  currency: z.string().length(3).default("USD"),
  metadata: z.record(z.unknown()).optional(),
});

export const analyticsPeriodSchema = z.enum(["7d", "30d", "90d"]).default("30d");

export const analyticsFilterSchema = z.object({
  period: z.enum(ANALYTICS_PERIODS).default("30d"),
  from: z.string().optional(),
  to: z.string().optional(),
  bundleId: z.string().optional(),
  eventType: z.enum(ANALYTICS_EVENT_TYPES).optional(),
  status: z.enum(["all", "active", "draft", "paused"]).default("all"),
});

export type TrackEventInput = z.infer<typeof trackEventSchema>;
export type AnalyticsPeriod = z.infer<typeof analyticsPeriodSchema>;
export type AnalyticsFilters = z.infer<typeof analyticsFilterSchema>;

export function parseAnalyticsFilters(
  params: URLSearchParams | Record<string, string | undefined>,
): AnalyticsFilters {
  const get = (key: string) =>
    params instanceof URLSearchParams ? params.get(key) ?? undefined : params[key];

  return analyticsFilterSchema.parse({
    period: get("period") ?? "30d",
    from: get("from") || undefined,
    to: get("to") || undefined,
    bundleId: get("bundleId") || undefined,
    eventType: get("eventType") || undefined,
    status: get("status") || "all",
  });
}
