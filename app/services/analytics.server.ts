import type { TrackEventInput } from "../schemas/analytics.schema";
import {
  getAnalyticsDashboard,
  recordAnalyticsEvent,
} from "../models/analytics.server";

export type AnalyticsDashboardData = Awaited<
  ReturnType<typeof getAnalyticsDashboard>
>;

export { getAnalyticsDashboard };

export async function trackStorefrontEvent(
  shop: string,
  input: TrackEventInput,
) {
  return recordAnalyticsEvent(shop, {
    eventType: input.eventType,
    bundleId: input.bundleId,
    revenue: input.revenue,
    currency: input.currency,
    metadata: input.metadata,
  });
}

export async function trackBundlePurchasesFromOrder(
  shop: string,
  order: {
    id: number | string;
    total_price?: string;
    currency?: string;
    line_items?: Array<{
      price?: string;
      quantity?: number;
      properties?: Array<{ name: string; value: string }>;
    }>;
  },
) {
  const lineItems = order.line_items ?? [];
  const bundleIds = new Set<string>();

  for (const item of lineItems) {
    const props = item.properties ?? [];
    const bundleProp = props.find((p) => p.name === "_appify_bundle_id");
    if (bundleProp?.value) {
      bundleIds.add(bundleProp.value);
      const itemRevenue =
        parseFloat(item.price ?? "0") * (item.quantity ?? 1);

      await recordAnalyticsEvent(shop, {
        eventType: "purchase",
        bundleId: bundleProp.value,
        revenue: itemRevenue,
        currency: order.currency ?? "USD",
        metadata: { orderId: String(order.id) },
      });
    }
  }

  if (bundleIds.size === 0 && lineItems.length > 0) {
    return null;
  }

  return { bundleIds: [...bundleIds] };
}
