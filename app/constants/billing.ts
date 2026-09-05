export const APPIFY_BUNDLES = "APPIFY_BUNDLES";
/** Shopify App Pricing forces lowercase plan handles. */
export const APPIFY_BUNDLES_HANDLE = "appify-bundles";
/** Must match the Shopify App Pricing meter handle exactly. */
export const ORDER_PROCESSED_EVENT_HANDLE = "order_processed";
export const TIER_500 = "TIER_500";
export const TIER_1500 = "TIER_1500";
export const TIER_SCALE = "TIER_SCALE";

/** @deprecated Mapped to TIER_500 */
export const TIER_1000 = "TIER_1000";
/** @deprecated Mapped to TIER_1500 */
export const TIER_2000 = "TIER_2000";
/** @deprecated Mapped to TIER_1500 */
export const TIER_4000 = "TIER_4000";
/** @deprecated Mapped to TIER_SCALE */
export const TIER_ENTERPRISE = "TIER_ENTERPRISE";

export const BILLING_PLAN_KEYS = [TIER_500, TIER_1500, TIER_SCALE] as const;

export const LEGACY_BILLING_PLAN_KEYS = [
  TIER_1000,
  TIER_2000,
  TIER_4000,
  TIER_ENTERPRISE,
] as const;

export const SHOPIFY_BILLING_PLAN_KEYS = [
  APPIFY_BUNDLES,
  APPIFY_BUNDLES_HANDLE,
  ...BILLING_PLAN_KEYS,
  ...LEGACY_BILLING_PLAN_KEYS,
] as const;

export type BillingPlanKey = (typeof BILLING_PLAN_KEYS)[number];
export type AnyBillingPlanKey =
  | BillingPlanKey
  | (typeof LEGACY_BILLING_PLAN_KEYS)[number];

export const MONTHLY_CHARGE_CAP = 799.99;
export const USAGE_RATE_PER_ORDER = 0.01;
export const USAGE_ORDER_THRESHOLD = 1500;
export const TRIAL_DAYS = 7;
export const SUBSCRIPTION_BASE_AMOUNT = 50;
export const USAGE_TERMS =
  "Monthly charge from order volume: $50 (0–500), $125 (501–1,500), $175 plus $0.01 per order over 1,500";

export interface BillingTierDefinition {
  key: BillingPlanKey;
  name: string;
  description: string;
  minOrders: number;
  maxOrders: number;
  baseAmount: number;
  hasUsage: boolean;
}

export const BILLING_TIERS: Record<BillingPlanKey, BillingTierDefinition> = {
  [TIER_500]: {
    key: TIER_500,
    name: "Starter",
    description: "0–500 orders per month",
    minOrders: 0,
    maxOrders: 500,
    baseAmount: 50,
    hasUsage: false,
  },
  [TIER_1500]: {
    key: TIER_1500,
    name: "Growth",
    description: "501–1,500 orders per month",
    minOrders: 501,
    maxOrders: 1500,
    baseAmount: 125,
    hasUsage: false,
  },
  [TIER_SCALE]: {
    key: TIER_SCALE,
    name: "Scale",
    description: "1,501+ orders — $175 plus $0.01 per order over 1,500",
    minOrders: 1501,
    maxOrders: Number.POSITIVE_INFINITY,
    baseAmount: 175,
    hasUsage: true,
  },
};

export const BILLING_PLANS = BILLING_TIERS;

export const STARTER_PLAN = TIER_500;
export const GROWTH_PLAN = TIER_1500;
export const SCALE_PLAN = TIER_SCALE;
/** @deprecated Use GROWTH_PLAN */
export const PRO_PLAN = TIER_SCALE;

const LEGACY_PLAN_MAP: Record<string, BillingPlanKey> = {
  [TIER_500]: TIER_500,
  [TIER_1500]: TIER_1500,
  [TIER_SCALE]: TIER_SCALE,
  [TIER_1000]: TIER_500,
  [TIER_2000]: TIER_1500,
  [TIER_4000]: TIER_1500,
  [TIER_ENTERPRISE]: TIER_SCALE,
};

const LEGACY_BASE_AMOUNTS: Record<string, number> = {
  [TIER_1000]: 40,
  [TIER_2000]: 75,
  [TIER_4000]: 100,
  [TIER_ENTERPRISE]: 130,
};

export function isVolumeSubscription(value: string | null | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase().replace(/[_\s]+/g, "-");
  return (
    normalized === APPIFY_BUNDLES_HANDLE ||
    normalized === APPIFY_BUNDLES.toLowerCase().replace(/_/g, "-")
  );
}

export function canonicalizePlanKey(
  value: string | null | undefined,
): BillingPlanKey | null {
  if (!value) return null;
  return LEGACY_PLAN_MAP[value.trim()] ?? null;
}

export function subscribedBaseAmount(
  planKey: string | null | undefined,
): number {
  if (!planKey || isVolumeSubscription(planKey)) return 0;
  if (planKey in LEGACY_BASE_AMOUNTS) {
    return LEGACY_BASE_AMOUNTS[planKey];
  }
  const canonical = canonicalizePlanKey(planKey);
  if (!canonical) return 0;
  return BILLING_TIERS[canonical].baseAmount;
}

export function isBillingTestModeForced(): boolean | null {
  const value = process.env.SHOPIFY_BILLING_TEST;
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

/** @deprecated Use isShopBillingTestMode() for per-store detection */
export const isBillingTestMode = process.env.SHOPIFY_BILLING_TEST !== "false";

export const DEFAULT_WIDGET_COLORS = {
  primaryColor: "#008060",
  secondaryColor: "#ffffff",
  accentColor: "#ffc453",
  textColor: "#202223",
  borderColor: "#e1e3e5",
  badgeColor: "#d82c0d",
  badgeTextColor: "#ffffff",
  selectedBorderColor: "#008060",
  backgroundColor: "#fafbfb",
  borderRadius: "8",
  fontSize: "14",
} as const;

export type WidgetColors = typeof DEFAULT_WIDGET_COLORS;
