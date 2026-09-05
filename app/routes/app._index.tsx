import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { getDashboardData } from "../models/bundle.server";
import { getAnalyticsSummary } from "../models/analytics.server";
import { formatCurrency } from "../utils/analytics-format";
import { CreateBundleButton } from "../components/CreateBundleButton";
import { SetupGuide } from "../components/SetupGuide";
import { getThemeEditorEmbedUrl } from "../constants/bundle-types";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const apiKey = process.env.SHOPIFY_API_KEY || "";

  const [dashboard, analytics] = await Promise.all([
    getDashboardData(session.shop),
    getAnalyticsSummary(session.shop, "30d"),
  ]);

  return {
    ...dashboard,
    analytics,
    themeEditorUrl: getThemeEditorEmbedUrl(session.shop, apiKey),
  };
};

export const headers: HeadersFunction = (headersArgs) => {
  const headers = boundary.headers(headersArgs);
  headers.set("Cache-Control", "private, no-cache");
  return headers;
};

export default function Dashboard() {
  const { bundles, totalBundles, activeCount, dismissed, themeEditorUrl, analytics } =
    useLoaderData<typeof loader>();

  return (
    <s-page heading="Appify Bundles">
      <CreateBundleButton slot="primary-action" />

      <s-section heading="Overview">
        <div className="dashboard-stats">
          <div className="dashboard-stat">
            <span className="dashboard-stat__label">Total bundles</span>
            <span className="dashboard-stat__value">{totalBundles}</span>
          </div>
          <div className="dashboard-stat">
            <span className="dashboard-stat__label">Active</span>
            <span className="dashboard-stat__value">{activeCount}</span>
          </div>
          <div className="dashboard-stat">
            <span className="dashboard-stat__label">30-day revenue</span>
            <span className="dashboard-stat__value">
              {formatCurrency(analytics.revenue)}
            </span>
          </div>
          <div className="dashboard-stat">
            <span className="dashboard-stat__label">Conversion</span>
            <span className="dashboard-stat__value">
              {analytics.conversionRate.toFixed(1)}%
            </span>
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <s-link href="/app/analytics">View full analytics →</s-link>
        </div>
      </s-section>

      <SetupGuide
        themeEditorUrl={themeEditorUrl}
        hasBundles={totalBundles > 0}
        dismissed={dismissed}
      />

      <s-section heading="Recent bundles">
        {bundles.length === 0 ? (
          <s-paragraph>
            No bundles yet.{" "}
            <s-link href="/app/bundles/new">Create your first bundle</s-link> to
            boost average order value.
          </s-paragraph>
        ) : (
          <s-stack direction="block" gap="base">
            {bundles.map((bundle) => (
              <s-box
                key={bundle.id}
                padding="base"
                borderWidth="base"
                borderRadius="base"
              >
                <s-stack direction="inline" gap="base">
                  <s-stack direction="block" gap="small">
                    <s-link href={`/app/bundles/${bundle.id}`}>
                      {bundle.title}
                    </s-link>
                    <s-text tone="neutral">
                      {bundle._count.items} products · {bundle.type} ·{" "}
                      {bundle.status}
                    </s-text>
                  </s-stack>
                  <s-badge
                    tone={bundle.status === "active" ? "success" : "info"}
                  >
                    {bundle.status}
                  </s-badge>
                </s-stack>
              </s-box>
            ))}
            <s-link href="/app/bundles">View all bundles</s-link>
          </s-stack>
        )}
      </s-section>

      <s-section slot="aside" heading="Get started">
        <s-unordered-list>
          <s-list-item>
            <s-link href={themeEditorUrl} target="_blank">
              Activate app embed on product pages
            </s-link>
          </s-list-item>
          <s-list-item>
            <s-link href="/app/bundles/new">Create a product bundle</s-link>
          </s-list-item>
          <s-list-item>
            <s-link href="/app/settings">Customize widget colors</s-link>
          </s-list-item>
        </s-unordered-list>
      </s-section>
    </s-page>
  );
}
