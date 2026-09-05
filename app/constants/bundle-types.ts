export type BundleTypeId =
  | "quantity_break"
  | "bogo"
  | "mix_match"
  | "fixed_bundle"
  | "fbt_upsell"
  | "gifts";

export type BundleTypeGroup = "volume" | "advanced";

export interface BundleTypeDefinition {
  id: BundleTypeId;
  group: BundleTypeGroup;
  title: string;
  description: string;
  defaultTitle: string;
  discountType: "percentage" | "fixed";
  defaultDiscount: number;
  layout: string;
}

export const BUNDLE_TYPE_GROUPS: Record<
  BundleTypeGroup,
  { heading: string; description: string }
> = {
  volume: {
    heading: "Choose a discount type",
    description: "You can fully customize it later.",
  },
  advanced: {
    heading: "More ways to grow AOV",
    description: "Bundles, add-ons, and gift unlocks that lift average order value.",
  },
};

export const BUNDLE_TYPES: BundleTypeDefinition[] = [
  {
    id: "quantity_break",
    group: "volume",
    title: "Quantity breaks",
    description: "Buy more of one product, pay less — multipacks, volume, and wholesale tiers.",
    defaultTitle: "Buy more, save more",
    discountType: "percentage",
    defaultDiscount: 15,
    layout: "tiers",
  },
  {
    id: "bogo",
    group: "volume",
    title: "Buy X get Y",
    description: "Classic BOGO and multi-tier buy-more-get-more offers.",
    defaultTitle: "Buy more, get more",
    discountType: "percentage",
    defaultDiscount: 50,
    layout: "bxgy",
  },
  {
    id: "mix_match",
    group: "volume",
    title: "Mix & match",
    description: "Customers pick from a product pool and unlock volume savings.",
    defaultTitle: "Build your bundle",
    discountType: "percentage",
    defaultDiscount: 15,
    layout: "mix_match",
  },
  {
    id: "fixed_bundle",
    group: "advanced",
    title: "Product bundle",
    description: "A defined set added in one click — fixed packs or complete-the-set.",
    defaultTitle: "Complete the set",
    discountType: "percentage",
    defaultDiscount: 20,
    layout: "complete",
  },
  {
    id: "fbt_upsell",
    group: "advanced",
    title: "Frequently bought together",
    description: "Checkbox add-ons and one-click upsells on the product page.",
    defaultTitle: "Frequently bought together",
    discountType: "percentage",
    defaultDiscount: 10,
    layout: "fbt",
  },
  {
    id: "gifts",
    group: "advanced",
    title: "Free gifts",
    description: "Unlock free gifts and free shipping as cart value or quantity grows.",
    defaultTitle: "Unlock free gifts",
    discountType: "percentage",
    defaultDiscount: 0,
    layout: "gifts",
  },
];

export const COLOR_THEMES = [
  { id: "black", primary: "#1a1a1a", badge: "#1a1a1a" },
  { id: "red", primary: "#d82c0d", badge: "#d82c0d" },
  { id: "orange", primary: "#f49342", badge: "#f49342" },
  { id: "yellow", primary: "#eec200", badge: "#eec200" },
  { id: "green", primary: "#008060", badge: "#008060" },
  { id: "blue", primary: "#2c6ecb", badge: "#2c6ecb" },
  { id: "purple", primary: "#6f42c1", badge: "#6f42c1" },
  { id: "pink", primary: "#e83e8c", badge: "#e83e8c" },
] as const;

const TYPE_ALIASES: Record<string, BundleTypeId> = {
  quantity_break: "quantity_break",
  quantity_break_same: "quantity_break",
  bogo: "bogo",
  bxgy: "bogo",
  mix_match: "mix_match",
  quantity_break_different: "mix_match",
  fixed_bundle: "fixed_bundle",
  complete: "fixed_bundle",
  complete_bundle: "fixed_bundle",
  fbt_upsell: "fbt_upsell",
  subscription: "quantity_break",
  gifts: "gifts",
  progressive_gifts: "gifts",
};

export function canonicalizeBundleTypeId(id: string): BundleTypeId | undefined {
  return TYPE_ALIASES[id];
}

export function getBundleType(id: string): BundleTypeDefinition | undefined {
  const canonical = canonicalizeBundleTypeId(id) ?? (id as BundleTypeId);
  return BUNDLE_TYPES.find((t) => t.id === canonical);
}

export function getThemeEditorEmbedUrl(shop: string, apiKey: string) {
  const shopDomain = shop.replace(/^https?:\/\//, "");
  return `https://${shopDomain}/admin/themes/current/editor?context=apps&template=product&activateAppId=${apiKey}/bundle-embed`;
}

export function mapBundleTypeToDb(type: BundleTypeDefinition) {
  const map: Record<BundleTypeId, { type: string; layout: string }> = {
    quantity_break: { type: "quantity_break", layout: "tiers" },
    bogo: { type: "bogo", layout: "bxgy" },
    mix_match: { type: "mix_match", layout: "mix_match" },
    fixed_bundle: { type: "fixed_bundle", layout: "complete" },
    fbt_upsell: { type: "fbt_upsell", layout: "fbt" },
    gifts: { type: "gifts", layout: "gifts" },
  };
  return map[type.id];
}

const DB_TYPE_TO_BUNDLE_TYPE: Record<string, BundleTypeId> = {
  quantity_break: "quantity_break",
  bxgy: "bogo",
  bogo: "bogo",
  mix_match: "mix_match",
  complete: "fixed_bundle",
  fixed_bundle: "fixed_bundle",
  fbt_upsell: "fbt_upsell",
  subscription: "quantity_break",
  progressive_gifts: "gifts",
  gifts: "gifts",
};

export function resolveBundleTypeId(
  dbType: string,
  layout?: string,
): BundleTypeId {
  if (DB_TYPE_TO_BUNDLE_TYPE[dbType]) {
    return DB_TYPE_TO_BUNDLE_TYPE[dbType];
  }
  const aliased = canonicalizeBundleTypeId(dbType);
  if (aliased) return aliased;
  if (layout) {
    const match = BUNDLE_TYPES.find((t) => t.layout === layout);
    if (match) return match.id;
    if (layout === "bxgy") return "bogo";
    if (layout === "complete") return "fixed_bundle";
    if (layout === "subscription") return "quantity_break";
    if (layout === "fbt") return "fbt_upsell";
  }
  return "quantity_break";
}

export const EDITOR_ENABLED_TYPES: BundleTypeId[] = BUNDLE_TYPES.map(
  (t) => t.id,
);

export const HIDES_THEME_ATC: BundleTypeId[] = [
  "quantity_break",
  "bogo",
  "mix_match",
  "fixed_bundle",
];
