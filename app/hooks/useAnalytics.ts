import { useQuery } from "@tanstack/react-query";
import type { AnalyticsFilters } from "../schemas/analytics.schema";
import type { AnalyticsDashboardData } from "../services/analytics.server";

function filtersToQuery(filters: AnalyticsFilters): string {
  const params = new URLSearchParams();
  params.set("period", filters.period);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.bundleId) params.set("bundleId", filters.bundleId);
  if (filters.eventType) params.set("eventType", filters.eventType);
  if (filters.status && filters.status !== "all") {
    params.set("status", filters.status);
  }
  return params.toString();
}

async function fetchAnalytics(
  filters: AnalyticsFilters,
): Promise<AnalyticsDashboardData> {
  const res = await fetch(`/app/analytics/data?${filtersToQuery(filters)}`);
  if (!res.ok) throw new Error("Failed to fetch analytics");
  return res.json();
}

export function useAnalytics(
  filters: AnalyticsFilters,
  initialData?: AnalyticsDashboardData,
) {
  return useQuery({
    queryKey: ["analytics", filters],
    queryFn: () => fetchAnalytics(filters),
    initialData:
      initialData &&
      JSON.stringify(initialData.filters) === JSON.stringify(filters)
        ? initialData
        : undefined,
    refetchInterval: 60_000,
  });
}
