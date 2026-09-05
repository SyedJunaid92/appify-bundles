import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { Form, useActionData, useLoaderData, useNavigation } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import {
  APPIFY_BUNDLES,
  BILLING_PLAN_KEYS,
  BILLING_TIERS,
  MONTHLY_CHARGE_CAP,
  SHOPIFY_BILLING_PLAN_KEYS,
  TRIAL_DAYS,
  USAGE_ORDER_THRESHOLD,
  USAGE_RATE_PER_ORDER,
  canonicalizePlanKey,
  isVolumeSubscription,
} from "../constants/billing";
import { clearActivePlan, getBillingSummary } from "../models/billing.server";
import { formatOrderRange } from "../utils/billing-calculation";
import {
  billingModeLabel,
  isShopBillingTestMode,
} from "../services/billing-mode.server";
import { requestVolumeBillingIfNeeded } from "../services/billing-gate.server";
import { volumeBillingReturnUrl } from "../utils/embedded-app";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { billing, admin, session } = await authenticate.admin(request);
  const { isTest } = await requestVolumeBillingIfNeeded(
    request,
    billing,
    admin,
    session.shop,
  );

  const billingCheck = await billing.check({
    plans: [...SHOPIFY_BILLING_PLAN_KEYS],
    isTest,
  });

  const summary = await getBillingSummary(session.shop);
  const currentPlan = summary.recommendedPlan;
  const shopifyPlanName = billingCheck.appSubscriptions[0]?.name;
  const hasActivePayment =
    billingCheck.hasActivePayment || isVolumeSubscription(shopifyPlanName);

  return {
    tiers: BILLING_TIERS,
    hasActivePayment,
    currentPlan,
    subscription: billingCheck.appSubscriptions[0] ?? null,
    monthlyOrderCount: summary.billing.monthlyOrderCount,
    charge: summary.charge,
    history: summary.history,
    daysRemaining: summary.daysRemaining,
    monthlyCap: MONTHLY_CHARGE_CAP,
    isTest,
    billingModeLabel: billingModeLabel(isTest),
    trialDays: TRIAL_DAYS,
    usageRate: USAGE_RATE_PER_ORDER,
    usageThreshold: USAGE_ORDER_THRESHOLD,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { billing, admin, session } = await authenticate.admin(request);
  const isTest = await isShopBillingTestMode(admin);
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "subscribe");

  if (intent === "cancel") {
    const billingCheck = await billing.check({
      plans: [...SHOPIFY_BILLING_PLAN_KEYS],
      isTest,
    });
    const subscriptionId = billingCheck.appSubscriptions[0]?.id;
    if (!subscriptionId) {
      return { error: "No Shopify subscription to cancel." };
    }
    await billing.cancel({
      subscriptionId,
      isTest,
      prorate: true,
    });
    await clearActivePlan(session.shop);
    return { success: "Billing cancelled." };
  }

  return billing.request({
    plan: APPIFY_BUNDLES,
    isTest,
    returnUrl: volumeBillingReturnUrl(request),
  });
};

function historyPlanName(planKey: string) {
  if (isVolumeSubscription(planKey)) return "Volume";
  const key = canonicalizePlanKey(planKey);
  return key ? BILLING_TIERS[key].name : planKey;
}

export default function BillingPage() {
  const {
    tiers,
    hasActivePayment,
    currentPlan,
    monthlyOrderCount,
    charge,
    history,
    daysRemaining,
    monthlyCap,
    isTest,
    billingModeLabel,
    trialDays,
    usageRate,
    usageThreshold,
  } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const busy = navigation.state !== "idle";
  const currentTier = tiers[currentPlan];

  return (
    <s-page
      heading={
        hasActivePayment
          ? "Volume billing is active"
          : "One plan. Price follows your orders."
      }
    >
      {actionData && "error" in actionData && actionData.error ? (
        <s-banner tone="critical">{actionData.error}</s-banner>
      ) : null}
      {actionData && "success" in actionData && actionData.success ? (
        <s-banner tone="success">{actionData.success}</s-banner>
      ) : null}

      <s-section heading="This period">
        <s-stack direction="block" gap="base">
          <s-badge tone={isTest ? "info" : "success"}>{billingModeLabel}</s-badge>
          <s-text>
            {hasActivePayment
              ? "Appify Bundles reports order volume to Shopify each period. Shopify charges the matching band automatically."
              : `Approve once on Shopify. After that, monthly orders set the charge: $50, $125, or $175 plus $${usageRate.toFixed(2)} over ${usageThreshold.toLocaleString()}. ${trialDays}-day free trial.`}
          </s-text>
          <s-stack direction="inline" gap="large">
            <s-box padding="base" borderWidth="base" borderRadius="base">
              <s-stack direction="block" gap="small">
                <s-text tone="neutral">Orders this period</s-text>
                <s-heading>{monthlyOrderCount.toLocaleString()}</s-heading>
                <s-text tone="neutral">{daysRemaining} days remaining</s-text>
              </s-stack>
            </s-box>
            <s-box padding="base" borderWidth="base" borderRadius="base">
              <s-stack direction="block" gap="small">
                <s-text tone="neutral">This month’s price</s-text>
                <s-heading>${charge.cappedAmount.toFixed(2)}</s-heading>
                {charge.wasCapped && (
                  <s-text tone="neutral">Capped at ${monthlyCap}/mo</s-text>
                )}
              </s-stack>
            </s-box>
            <s-box padding="base" borderWidth="base" borderRadius="base">
              <s-stack direction="block" gap="small">
                <s-text tone="neutral">Your volume band</s-text>
                <s-heading>{currentTier.name}</s-heading>
                <s-text tone="neutral">{currentTier.description}</s-text>
              </s-stack>
            </s-box>
          </s-stack>
        </s-stack>
      </s-section>

      <s-section heading="How Shopify charges">
        <s-stack direction="block" gap="base">
          {BILLING_PLAN_KEYS.map((key) => {
            const tier = tiers[key];
            const isCurrent = currentPlan === key;
            return (
              <s-box
                key={key}
                padding="base"
                borderWidth="base"
                borderRadius="base"
              >
                <s-stack direction="block" gap="small">
                  <s-stack direction="inline" gap="small">
                    <s-heading>{tier.name}</s-heading>
                    {isCurrent && <s-badge tone="info">Your volume</s-badge>}
                  </s-stack>
                  <s-text>
                    ${tier.baseAmount}/month
                    {tier.hasUsage
                      ? ` + $${usageRate.toFixed(2)}/order over ${usageThreshold.toLocaleString()}`
                      : ""}
                  </s-text>
                  <s-text tone="neutral">{formatOrderRange(key)}</s-text>
                </s-stack>
              </s-box>
            );
          })}
        </s-stack>
      </s-section>

      <s-section heading={hasActivePayment ? "Subscription" : "Approve billing"}>
        {hasActivePayment ? (
          <s-stack direction="block" gap="base">
            <s-banner tone="success">
              Volume billing is on. Shopify will invoice ${charge.cappedAmount.toFixed(2)}{" "}
              for {monthlyOrderCount.toLocaleString()} orders this period. If
              volume moves, the charge moves with it.
            </s-banner>
            <Form method="post">
              <input type="hidden" name="intent" value="cancel" />
              <s-button
                type="submit"
                variant="secondary"
                {...(busy ? { loading: true } : {})}
              >
                Cancel billing
              </s-button>
            </Form>
          </s-stack>
        ) : (
          <s-stack direction="block" gap="base">
            <s-banner tone="warning">
              Approve volume billing on Shopify to keep using Appify Bundles.
              You do not pick a plan — Shopify charges the band that matches
              your monthly orders.
            </s-banner>
            <Form method="post">
              <input type="hidden" name="intent" value="subscribe" />
              <s-button
                type="submit"
                variant="primary"
                {...(busy ? { loading: true } : {})}
              >
                Continue on Shopify
              </s-button>
            </Form>
          </s-stack>
        )}
      </s-section>

      {history.length > 0 && (
        <s-section heading="Billing history">
          <s-text tone="neutral">
            Last {history.length} month{history.length === 1 ? "" : "s"} for
            this store.
          </s-text>
          <s-stack direction="block" gap="base">
            {history.map((entry) => (
              <s-box
                key={entry.id}
                padding="base"
                borderWidth="base"
                borderRadius="base"
              >
                <s-stack direction="inline" gap="base">
                  <s-stack direction="block" gap="small">
                    <s-text>
                      {new Date(entry.periodStart).toLocaleDateString()} –{" "}
                      {new Date(entry.periodEnd).toLocaleDateString()}
                    </s-text>
                    <s-text tone="neutral">
                      {entry.orderCount.toLocaleString()} orders ·{" "}
                      {historyPlanName(entry.planKey)}
                    </s-text>
                  </s-stack>
                  <s-stack direction="block" gap="small">
                    <s-text>${Number(entry.totalAmount).toFixed(2)}</s-text>
                    <s-badge
                      tone={entry.status === "charged" ? "success" : "info"}
                    >
                      {entry.status}
                    </s-badge>
                  </s-stack>
                </s-stack>
              </s-box>
            ))}
          </s-stack>
        </s-section>
      )}

      <s-section slot="aside" heading="How billing works">
        <s-unordered-list>
          <s-list-item>
            Approve once. There is no plan to select.
          </s-list-item>
          <s-list-item>
            0–500 orders: $50. 501–1,500: $125. 1,501+: $175 + $
            {usageRate.toFixed(2)} per order over {usageThreshold.toLocaleString()}
            .
          </s-list-item>
          <s-list-item>
            Shopify collects that amount as usage on a recurring invoice, capped
            at ${monthlyCap}/month.
          </s-list-item>
          <s-list-item>
            History for the last 12 months appears here when records exist.
          </s-list-item>
        </s-unordered-list>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
