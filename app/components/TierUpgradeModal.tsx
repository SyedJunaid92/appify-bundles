import { useFetcher } from "react-router";
import {
  BILLING_TIERS,
  type BillingPlanKey,
} from "../constants/billing";
import { formatOrderRange } from "../utils/billing-calculation";

type Props = {
  upgradePlan: BillingPlanKey;
  currentPlan: BillingPlanKey;
  monthlyOrderCount: number;
};

export function TierUpgradeModal({
  upgradePlan,
  currentPlan,
  monthlyOrderCount,
}: Props) {
  const fetcher = useFetcher();
  const dismissFetcher = useFetcher();
  const isSubmitting =
    fetcher.state !== "idle" || dismissFetcher.state !== "idle";

  const currentTier = BILLING_TIERS[currentPlan];
  const nextTier = BILLING_TIERS[upgradePlan];

  return (
    <div className="tier-modal-overlay" role="dialog" aria-modal="true">
      <div className="tier-modal">
        <s-stack direction="block" gap="base">
          <s-heading>Order limit reached</s-heading>
          <s-paragraph>
            You&apos;ve reached the {currentTier.maxOrders.toLocaleString()}-order
            limit for {currentTier.name} ({monthlyOrderCount.toLocaleString()}{" "}
            orders this period). Upgrade to {nextTier.name} to keep your bundles
            running on the storefront.
          </s-paragraph>
          <s-box padding="base" borderWidth="base" borderRadius="base" background="subdued">
            <s-stack direction="block" gap="small">
              <s-text>
                <strong>{nextTier.name}</strong> — ${nextTier.baseAmount}/month
              </s-text>
              <s-text tone="neutral">{formatOrderRange(upgradePlan)}</s-text>
              <s-text tone="neutral">{nextTier.description}</s-text>
            </s-stack>
          </s-box>
          <s-text tone="neutral">
            If you close without upgrading, all active bundles will be paused
            until you approve the new plan payment.
          </s-text>
          <s-stack direction="inline" gap="base">
            <fetcher.Form method="post" action="/app/billing/enforcement">
              <input type="hidden" name="intent" value="upgrade" />
              <input type="hidden" name="plan" value={upgradePlan} />
              <s-button type="submit" variant="primary" {...(isSubmitting ? { loading: true } : {})}>
                Upgrade to {nextTier.name}
              </s-button>
            </fetcher.Form>
            <dismissFetcher.Form method="post" action="/app/billing/enforcement">
              <input type="hidden" name="intent" value="dismiss" />
              <s-button type="submit" variant="secondary" {...(isSubmitting ? { loading: true } : {})}>
                Close and pause bundles
              </s-button>
            </dismissFetcher.Form>
          </s-stack>
        </s-stack>
      </div>
    </div>
  );
}
