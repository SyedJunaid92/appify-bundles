type BundleListItem = {
  discountType: string;
  discountValue: unknown;
  type: string;
  tiers?: Array<{ discountType: string; discountValue: unknown }>;
};

function toSafeNumber(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (typeof value === "object" && value !== null && "toNumber" in value) {
    const parsed = (value as { toNumber: () => number }).toNumber();
    return Number.isFinite(parsed) ? parsed : 0;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatBundleDiscountLabel(bundle: BundleListItem): string {
  const tiers = bundle.tiers ?? [];
  const maxTierDiscount = tiers.reduce((max, tier) => {
    const value = toSafeNumber(tier.discountValue);
    if (tier.discountType === "fixed" && value > 0) return max;
    return Math.max(max, value);
  }, 0);

  const discountValue = toSafeNumber(bundle.discountValue);
  const effectiveDiscount = Math.max(discountValue, maxTierDiscount);

  if (bundle.discountType === "fixed" && effectiveDiscount > 0) {
    return `$${effectiveDiscount.toFixed(2)} off`;
  }

  if (effectiveDiscount > 0) {
    return `${effectiveDiscount}% off`;
  }

  if (tiers.length > 0) {
    return "Volume pricing";
  }

  return "No discount";
}

const TYPE_LABELS: Record<string, string> = {
  quantity_break: "Quantity breaks",
  bogo: "Buy X get Y",
  bxgy: "Buy X get Y",
  mix_match: "Mix & match",
  fixed_bundle: "Product bundle",
  complete: "Product bundle",
  fbt_upsell: "Frequently bought together",
  gifts: "Free gifts",
  progressive_gifts: "Free gifts",
};

export function formatBundleTypeLabel(type: string): string {
  return TYPE_LABELS[type] ?? type.replace(/_/g, " ");
}
