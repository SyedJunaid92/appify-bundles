import type { HeadersFunction, LoaderFunctionArgs, ShouldRevalidateFunctionArgs } from "react-router";
import { Outlet, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { QueryProvider } from "../providers/QueryProvider";
import { ThemeProvider } from "../providers/ThemeProvider";
import { ThemeToggle } from "../components/ThemeToggle";
import { TierUpgradeModal } from "../components/TierUpgradeModal";
import { BillingEnforcementBanner } from "../components/BillingEnforcementBanner";
import { authenticate } from "../shopify.server";
import { getBillingEnforcementState } from "../services/billing-enforcement.server";
import { enforceVolumeBillingGate } from "../services/billing-gate.server";
import { countPausedBundles } from "../models/bundle.server";
import type { BillingPlanKey } from "../constants/billing";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, billing, admin } = await authenticate.admin(request);
  const gate = await enforceVolumeBillingGate(
    request,
    billing,
    admin,
    session.shop,
  );
  const enforcement = await getBillingEnforcementState(session.shop);
  const pausedCount = enforcement.showPausedBanner
    ? await countPausedBundles(session.shop)
    : 0;

  return {
    apiKey: process.env.SHOPIFY_API_KEY || "",
    enforcement,
    pausedCount,
    hasPaidPlan: gate.hasPaidPlan,
  };
};

export function shouldRevalidate({
  currentUrl,
  nextUrl,
  formAction,
}: ShouldRevalidateFunctionArgs) {
  if (formAction?.includes("/billing/enforcement")) return true;
  if (formAction?.includes("/app/billing")) return true;
  if (nextUrl.searchParams.get("charge_id")) return true;
  if (nextUrl.searchParams.get("subscribed") === "true") return true;

  const currentPath = currentUrl.pathname;
  const nextPath = nextUrl.pathname;
  if (
    currentPath.startsWith("/app/bundles") &&
    nextPath.startsWith("/app/bundles")
  ) {
    return false;
  }

  return currentPath !== nextPath;
}

export default function App() {
  const { apiKey, enforcement, pausedCount, hasPaidPlan } =
    useLoaderData<typeof loader>();

  return (
    <AppProvider embedded apiKey={apiKey}>
      <QueryProvider>
        <ThemeProvider>
          <s-app-nav>
            {hasPaidPlan ? (
              <>
                <s-link href="/app">Dashboard</s-link>
                <s-link href="/app/bundles">Bundles</s-link>
                <s-link href="/app/analytics">Analytics</s-link>
                <s-link href="/app/settings">Widget</s-link>
              </>
            ) : null}
            <s-link href="/app/billing">Billing</s-link>
          </s-app-nav>
          <div className="app-shell">
            <div className="app-shell__theme-toggle">
              <ThemeToggle />
            </div>
            {enforcement.showPausedBanner && enforcement.upgradePlan && (
              <div className="app-shell__enforcement-banner">
                <BillingEnforcementBanner
                  upgradePlan={enforcement.upgradePlan}
                  pausedCount={pausedCount}
                />
              </div>
            )}
            <Outlet />
            {enforcement.showUpgradeModal &&
              enforcement.upgradePlan &&
              enforcement.activePlan && (
                <TierUpgradeModal
                  upgradePlan={enforcement.upgradePlan}
                  currentPlan={enforcement.activePlan as BillingPlanKey}
                  monthlyOrderCount={enforcement.monthlyOrderCount}
                />
              )}
          </div>
        </ThemeProvider>
      </QueryProvider>
    </AppProvider>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
