import {
  BILLING_TIERS,
  type BillingPlanKey,
} from "../constants/billing";

type Props = {
  upgradePlan: BillingPlanKey;
  pausedCount?: number;
};

export function BillingEnforcementBanner({ upgradePlan, pausedCount }: Props) {
  const tier = BILLING_TIERS[upgradePlan];

  return (
    <s-banner tone="warning">
      Your bundles are paused because you reached your plan&apos;s order limit.
      {pausedCount != null && pausedCount > 0
        ? ` ${pausedCount} bundle${pausedCount === 1 ? "" : "s"} paused.`
        : " "}
      Upgrade to {tier.name} (${tier.baseAmount}/mo) to restore them on your
      storefront.{" "}
      <s-link href="/app/billing">Go to billing</s-link>
    </s-banner>
  );
}
