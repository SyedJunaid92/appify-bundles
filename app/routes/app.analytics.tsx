import { useState } from "react";
import type { ActionFunctionArgs, HeadersFunction, LoaderFunctionArgs } from "react-router";
import { Form, useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { useAnalytics } from "../hooks/useAnalytics";
import {
  ANALYTICS_EVENT_TYPES,
  parseAnalyticsFilters,
  type AnalyticsFilters,
} from "../schemas/analytics.schema";
import {
  formatCurrency,
  formatPercent,
} from "../utils/analytics-format";
import { getAnalyticsDashboard } from "../services/analytics.server";
import { publishExperimentWinner } from "../services/experiment.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const filters = parseAnalyticsFilters(url.searchParams);
  return getAnalyticsDashboard(session.shop, filters);
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const form = await request.formData();
  const experimentId = String(form.get("experimentId") || "");
  const winner = String(form.get("winner") || "");
  if (winner !== "control" && winner !== "challenger") {
    return { error: "Pick a winner." };
  }
  return publishExperimentWinner(session.shop, experimentId, winner);
};

const EMPTY_FILTERS: AnalyticsFilters = {
  period: "30d",
  status: "all",
};

export default function AnalyticsPage() {
  const initialData = useLoaderData<typeof loader>();
  const [filters, setFilters] = useState<AnalyticsFilters>(
    initialData.filters ?? EMPTY_FILTERS,
  );
  const { data, isFetching } = useAnalytics(filters, initialData);
  const bundles = data?.bundles ?? initialData.bundles ?? [];

  const summary = data?.summary ?? initialData.summary;
  const byBundle = data?.byBundle ?? initialData.byBundle;
  const dailyTrend = data?.dailyTrend ?? initialData.dailyTrend;
  const maxViews = Math.max(...dailyTrend.map((d) => d.views), 1);

  return (
    <s-page heading="Analytics">
      <s-section heading="Filters">
        <s-stack direction="block" gap="base">
          <s-stack direction="inline" gap="base">
            {(["7d", "30d", "90d", "custom"] as const).map((p) => (
              <s-button
                key={p}
                variant={filters.period === p ? "primary" : "secondary"}
                onClick={() =>
                  setFilters((current) => ({ ...current, period: p }))
                }
              >
                {p === "7d"
                  ? "7 days"
                  : p === "30d"
                    ? "30 days"
                    : p === "90d"
                      ? "90 days"
                      : "Custom"}
              </s-button>
            ))}
            {isFetching && <s-spinner accessibilityLabel="Refreshing" />}
          </s-stack>

          {filters.period === "custom" && (
            <s-stack direction="inline" gap="base">
              <label className="text-sm theme-text">
                From
                <input
                  type="date"
                  className="ml-2 rounded border border-neutral-300 dark:border-neutral-700 bg-transparent px-2 py-1"
                  value={filters.from ?? ""}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      from: event.target.value || undefined,
                    }))
                  }
                />
              </label>
              <label className="text-sm theme-text">
                To
                <input
                  type="date"
                  className="ml-2 rounded border border-neutral-300 dark:border-neutral-700 bg-transparent px-2 py-1"
                  value={filters.to ?? ""}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      to: event.target.value || undefined,
                    }))
                  }
                />
              </label>
            </s-stack>
          )}

          <s-stack direction="inline" gap="base">
            <label className="text-sm theme-text">
              Bundle
              <select
                className="ml-2 rounded border border-neutral-300 dark:border-neutral-700 bg-transparent px-2 py-1"
                value={filters.bundleId ?? ""}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    bundleId: event.target.value || undefined,
                  }))
                }
              >
                <option value="">All bundles</option>
                {bundles.map((bundle) => (
                  <option key={bundle.id} value={bundle.id}>
                    {bundle.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm theme-text">
              Status
              <select
                className="ml-2 rounded border border-neutral-300 dark:border-neutral-700 bg-transparent px-2 py-1"
                value={filters.status}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    status: event.target.value as AnalyticsFilters["status"],
                  }))
                }
              >
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="paused">Paused</option>
              </select>
            </label>
            <label className="text-sm theme-text">
              Event
              <select
                className="ml-2 rounded border border-neutral-300 dark:border-neutral-700 bg-transparent px-2 py-1"
                value={filters.eventType ?? ""}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    eventType: event.target.value
                      ? (event.target.value as AnalyticsFilters["eventType"])
                      : undefined,
                  }))
                }
              >
                <option value="">All events</option>
                {ANALYTICS_EVENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </label>
          </s-stack>
        </s-stack>
      </s-section>

      <s-section heading="Key metrics">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label="Widget views" value={summary.views.toLocaleString()} />
          <MetricCard
            label="Add to cart"
            value={summary.addToCart.toLocaleString()}
            sub={formatPercent(summary.cartRate) + " of views"}
          />
          <MetricCard
            label="Purchases"
            value={summary.purchases.toLocaleString()}
            sub={formatPercent(summary.conversionRate) + " conversion"}
          />
          <MetricCard
            label="Bundle revenue"
            value={formatCurrency(summary.revenue)}
          />
        </div>
      </s-section>

      <s-section heading="Daily trend">
        {dailyTrend.every((d) => d.views === 0 && d.purchases === 0) ? (
          <s-paragraph tone="neutral">
            No analytics data yet. Views and purchases will appear once customers
            interact with your bundle widgets on the storefront.
          </s-paragraph>
        ) : (
          <div className="space-y-2">
            {dailyTrend.map((day) => (
              <div
                key={day.date}
                className="flex items-center gap-3 text-sm theme-text"
              >
                <span className="w-24 shrink-0 text-neutral-500 dark:text-neutral-400">
                  {formatShortDate(day.date)}
                </span>
                <div className="flex-1 h-6 bg-neutral-100 dark:bg-neutral-800 rounded overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 dark:bg-emerald-500 rounded transition-all"
                    style={{
                      width: `${Math.max((day.views / maxViews) * 100, day.views > 0 ? 4 : 0)}%`,
                    }}
                  />
                </div>
                <span className="w-16 text-right tabular-nums">
                  {day.views} views
                </span>
                <span className="w-20 text-right tabular-nums text-neutral-500">
                  {day.purchases} sold
                </span>
              </div>
            ))}
          </div>
        )}
      </s-section>

      {(data?.experiments ?? initialData.experiments ?? []).length > 0 && (
        <s-section heading="A/B tests">
          {(data?.experiments ?? initialData.experiments).map((test) => (
            <s-box key={test.id} padding="base" borderWidth="base" borderRadius="base">
              <s-stack direction="inline" gap="base">
                <s-stack direction="block" gap="small">
                  <s-text type="strong">{test.name}</s-text>
                  <s-text tone="neutral">
                    {test.trafficPercent}% challenger traffic
                  </s-text>
                </s-stack>
                <s-badge tone={test.status === "running" ? "success" : "info"}>
                  {test.status}
                </s-badge>
                {test.status === "running" && (
                  <s-stack direction="inline" gap="small">
                    <Form method="post">
                      <input type="hidden" name="experimentId" value={test.id} />
                      <input type="hidden" name="winner" value="control" />
                      <s-button variant="secondary" type="submit">
                        Publish control
                      </s-button>
                    </Form>
                    <Form method="post">
                      <input type="hidden" name="experimentId" value={test.id} />
                      <input type="hidden" name="winner" value="challenger" />
                      <s-button variant="primary" type="submit">
                        Publish challenger
                      </s-button>
                    </Form>
                  </s-stack>
                )}
              </s-stack>
            </s-box>
          ))}
        </s-section>
      )}

      <s-section heading="Performance by bundle">
        {byBundle.length === 0 ? (
          <s-paragraph tone="neutral">
            No bundle-specific data for this period.
          </s-paragraph>
        ) : (
          <s-stack direction="block" gap="base">
            {byBundle.map((bundle) => (
              <s-box
                key={bundle.bundleId}
                padding="base"
                borderWidth="base"
                borderRadius="base"
              >
                <s-stack direction="inline" gap="base">
                  <s-stack direction="block" gap="small">
                    <s-link href={`/app/bundles/${bundle.bundleId}`}>
                      {bundle.title}
                    </s-link>
                    <s-text tone="neutral">
                      {bundle.views} views · {bundle.addToCart} carts ·{" "}
                      {bundle.purchases} purchases ·{" "}
                      {formatPercent(bundle.conversionRate)} conv.
                    </s-text>
                  </s-stack>
                  <s-stack direction="block" gap="small">
                    <s-text>{formatCurrency(bundle.revenue)}</s-text>
                    <s-badge
                      tone={bundle.status === "active" ? "success" : "info"}
                    >
                      {bundle.status}
                    </s-badge>
                  </s-stack>
                </s-stack>
              </s-box>
            ))}
          </s-stack>
        )}
      </s-section>

      <s-section slot="aside" heading="About analytics">
        <s-unordered-list>
          <s-list-item>
            Views are tracked when the bundle widget loads on a product page.
          </s-list-item>
          <s-list-item>
            Add to cart events fire when customers use the bundle widget button.
          </s-list-item>
          <s-list-item>
            Purchases are attributed via bundle line item properties on orders.
          </s-list-item>
          <s-list-item>
            Charts read daily shop and bundle totals, so filters stay fast even
            as raw events grow.
          </s-list-item>
        </s-unordered-list>
      </s-section>
    </s-page>
  );
}

function MetricCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-4">
      <p className="text-sm text-neutral-500 dark:text-neutral-400">{label}</p>
      <p className="text-2xl font-semibold mt-1 theme-text tabular-nums">
        {value}
      </p>
      {sub && (
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
          {sub}
        </p>
      )}
    </div>
  );
}

function formatShortDate(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
