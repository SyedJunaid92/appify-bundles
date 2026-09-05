import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { Form, useLoaderData, useNavigation } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import {
  BILLING_PLAN_KEYS,
  BILLING_TIERS,
  MONTHLY_CHARGE_CAP,
  SHOPIFY_BILLING_PLAN_KEYS,
  TRIAL_DAYS,
  USAGE_ORDER_THRESHOLD,
  USAGE_RATE_PER_ORDER,
  canonicalizePlanKey,
  subscribedBaseAmount,
} from "../constants/billing";
import { getBillingSummary, setActivePlan } from "../models/billing.server";
import { selectPlanSchema } from "../schemas/billing.schema";
import { formatOrderRange } from "../utils/billing-calculation";
import {
  billingModeLabel,
  isShopBillingTestMode,
} from "../services/billing-mode.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { billing, admin, session } = await authenticate.admin(request);
  const isTest = await isShopBillingTestMode(admin);

  const billingCheck = await billing.check({
    plans: [...SHOPIFY_BILLING_PLAN_KEYS],
    isTest,
  });

  const summary = await getBillingSummary(session.shop);
  const currentPlan = summary.recommendedPlan;
  const shopifyPlanName = billingCheck.appSubscriptions[0]?.name;
  const subscribedPlan =
    canonicalizePlanKey(shopifyPlanName) ??
    canonicalizePlanKey(summary.billing.activePlan);
  const subscribedBase = subscribedBaseAmount(
    shopifyPlanName ?? summary.billing.activePlan,
  );
  const volumeTotal = summary.charge.cappedAmount;
  const needsLowerBase = Boolean(subscribedPlan && subscribedBase > volumeTotal);
  const usageWillApply = Boolean(
    subscribedPlan && volumeTotal > subscribedBase,
  );

  return {
    tiers: BILLING_TIERS,
    hasActivePayment: billingCheck.hasActivePayment,
    currentPlan,
    subscribedPlan,
    subscribedBase,
    subscription: billingCheck.appSubscriptions[0] ?? null,
    monthlyOrderCount: summary.billing.monthlyOrderCount,
    charge: summary.charge,
    needsLowerBase,
    usageWillApply,
    history: summary.history,
    daysRemaining: summary.daysRemaining,
    monthlyCap: MONTHLY_CHARGE_CAP,
    isTest,
    billingModeLabel: billingModeLabel(isTest),
    subscriptionStatus: summary.subscriptionStatus,
    hasActiveSubscription: summary.hasActiveSubscription,
    trialDays: TRIAL_DAYS,
    usageRate: USAGE_RATE_PER_ORDER,
    usageThreshold: USAGE_ORDER_THRESHOLD,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { billing, admin, session } = await authenticate.admin(request);
  const isTest = await isShopBillingTestMode(admin);
  const form = await request.formData();
  const parsed = selectPlanSchema.safeParse({
    plan: form.get("plan"),
  });

  if (!parsed.success) {
    return { error: "Invalid plan selected." };
  }

  await setActivePlan(session.shop, parsed.data.plan);

  return billing.request({
    plan: parsed.data.plan,
    isTest,
  });
};

function historyPlanName(planKey: string) {
  const key = canonicalizePlanKey(planKey);
  return key ? BILLING_TIERS[key].name : planKey;
}

export default function BillingPage() {
  const {
    tiers,
    hasActivePayment,
    currentPlan,
    subscribedPlan,
    subscribedBase,
    subscription,
    monthlyOrderCount,
    charge,
    needsLowerBase,
    usageWillApply,
    history,
    daysRemaining,
    monthlyCap,
    isTest,
    billingModeLabel,
    subscriptionStatus,
    hasActiveSubscription,
    trialDays,
    usageRate,
    usageThreshold,
  } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const currentTier = tiers[currentPlan];
  const subscribedTier = subscribedPlan ? tiers[subscribedPlan] : null;

  return (
    <s-page heading="Billing">
      <s-section heading="Current plan and orders">
        <s-stack direction="block" gap="base">
          <s-badge tone={isTest ? "info" : "success"}>{billingModeLabel}</s-badge>
          <s-stack direction="inline" gap="large">
            <s-box padding="base" borderWidth="base" borderRadius="base">
              <s-stack direction="block" gap="small">
                <s-text tone="neutral">Current plan this month</s-text>
                <s-heading>{currentTier.name}</s-heading>
                <s-text tone="neutral">{currentTier.description}</s-text>
              </s-stack>
            </s-box>
            <s-box padding="base" borderWidth="base" borderRadius="base">
              <s-stack direction="block" gap="small">
                <s-text tone="neutral">Orders this period</s-text>
                <s-heading>{monthlyOrderCount.toLocaleString()}</s-heading>
                <s-text tone="neutral">{daysRemaining} days remaining</s-text>
              </s-stack>
            </s-box>
            <s-box padding="base" borderWidth="base" borderRadius="base">
              <s-stack direction="block" gap="small">
                <s-text tone="neutral">Estimated charge</s-text>
                <s-heading>${charge.cappedAmount.toFixed(2)}</s-heading>
                {charge.wasCapped && (
                  <s-text tone="neutral">Capped at ${monthlyCap}/mo</s-text>
                )}
              </s-stack>
            </s-box>
          </s-stack>

          {hasActivePayment || hasActiveSubscription ? (
            <s-stack direction="inline" gap="base">
              <s-badge tone="success">Active</s-badge>
              {subscriptionStatus && subscriptionStatus !== "ACTIVE" && (
                <s-badge tone="info">{subscriptionStatus}</s-badge>
              )}
              <s-text>
                Shopify subscription:{" "}
                {subscribedTier?.name ?? subscription?.name ?? "Active"}
                {subscribedTier
                  ? ` ($${subscribedBase.toFixed(0)}/mo base)`
                  : ""}
              </s-text>
            </s-stack>
          ) : (
            <s-banner tone="warning">
              No active subscription. Select a plan below to continue using
              Appify Bundle.
            </s-banner>
          )}

          {usageWillApply && subscribedTier && (
            <s-banner tone="info">
              This month&apos;s volume is {currentTier.name} ($
              {charge.cappedAmount.toFixed(2)}). Shopify will collect the
              difference above your {subscribedTier.name} base as usage at the
              end of the period.
            </s-banner>
          )}

          {needsLowerBase && subscribedTier && (
            <s-banner tone="warning">
              You are subscribed to {subscribedTier.name} ($
              {subscribedBase.toFixed(0)}/mo), but this month&apos;s volume is{" "}
              {currentTier.name} (${charge.cappedAmount.toFixed(2)}). Select{" "}
              {currentTier.name} below to lower your Shopify base — recurring
              amounts cannot decrease without your approval.
            </s-banner>
          )}
        </s-stack>
      </s-section>

      <s-section heading="Plans">
        <s-stack direction="block" gap="base">
          {BILLING_PLAN_KEYS.map((key) => {
            const tier = tiers[key];
            const isVolumePlan = currentPlan === key;
            const isSubscribed = subscribedPlan === key;

            return (
              <s-box
                key={key}
                padding="base"
                borderWidth="base"
                borderRadius="base"
              >
                <s-stack direction="inline" gap="base">
                  <s-stack direction="block" gap="small">
                    <s-stack direction="inline" gap="small">
                      <s-heading>{tier.name}</s-heading>
                      {isVolumePlan && (
                        <s-badge tone="info">This month</s-badge>
                      )}
                      {isSubscribed && (
                        <s-badge tone="success">Shopify plan</s-badge>
                      )}
                    </s-stack>
                    <s-text tone="neutral">{tier.description}</s-text>
                    <s-text tone="neutral">{formatOrderRange(key)}</s-text>
                    <s-text>
                      ${tier.baseAmount}/month
                      {tier.hasUsage &&
                        ` + $${USAGE_RATE_PER_ORDER.toFixed(2)}/order over ${USAGE_ORDER_THRESHOLD.toLocaleString()} · max $${monthlyCap}/mo`}
                      {" · "}
                      {trialDays}-day free trial
                    </s-text>
                  </s-stack>
                  <Form method="post">
                    <input type="hidden" name="plan" value={key} />
                    <s-button
                      type="submit"
                      variant={isSubscribed ? "secondary" : "primary"}
                      {...(navigation.state === "submitting"
                        ? { loading: true }
                        : {})}
                    >
                      {isSubscribed ? "Current Shopify plan" : "Select plan"}
                    </s-button>
                  </Form>
                </s-stack>
              </s-box>
            );
          })}
        </s-stack>
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
            Recurring billing is charged through Shopify and adjusts each month
            from your order volume.
          </s-list-item>
          <s-list-item>
            0–500 orders: $50. 501–1,500 orders: $125. 1,501+ orders: $175 + $
            {usageRate.toFixed(2)} per order over {usageThreshold.toLocaleString()}
            .
          </s-list-item>
          <s-list-item>
            Extra volume is collected as Shopify usage on top of the plan you
            approved, capped at ${monthlyCap}/month.
          </s-list-item>
          <s-list-item>
            Monthly history is stored per store. The last 12 months appear here
            when records exist.
          </s-list-item>
        </s-unordered-list>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
