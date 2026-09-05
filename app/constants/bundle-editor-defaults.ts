import type {
  BundleEditorState,
  BundleBar,
  DealBadge,
  OfferItem,
  OverlayBadgeStyle,
} from "../types/bundle-editor";
import type { BundleTypeDefinition } from "./bundle-types";
import { getBundleType, resolveBundleTypeId } from "./bundle-types";

function newBarId() {
  return `bar-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createDefaultBarProduct(
  overrides: Partial<import("../types/bundle-editor").BarProduct> = {},
) {
  return {
    id: `bp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    productId: "",
    variantId: "",
    title: "Default product",
    quantity: 1,
    priceType: "percentage" as const,
    discountValue: 20,
    hidePrice: false,
    titleTemplate: "{{product}}",
    isDefault: true,
    ...overrides,
  };
}

export function createBar(overrides: Partial<BundleBar> = {}): BundleBar {
  return {
    id: newBarId(),
    kind: "product",
    quantity: 1,
    priceType: "full",
    discountValue: 0,
    title: "{{product}}",
    subtitle: "Standard price",
    badgeText: "",
    label: "",
    badgeStyle: "simple",
    isPopular: false,
    selectedByDefault: false,
    showQuantitySelector: false,
    requireVariantSelection: false,
    showProductsOnlyWhenSelected: false,
    applySellingPlan: false,
    soldOut: false,
    showProductCard: false,
    completeLayout: "grid",
    buyQty: 1,
    getQty: 1,
    getPriceType: "percentage",
    getDiscountValue: 100,
    products: [],
    image: null,
    upsell: null,
    gifts: [],
    personalisation: null,
    highlights: null,
    ...overrides,
  };
}

export const ADDABLE_BAR_KINDS = [
  {
    id: "quantity_break" as const,
    title: "Quantity break",
    icon: "percent",
  },
  {
    id: "bogo" as const,
    title: "Buy X, get Y",
    icon: "megaphone",
  },
  {
    id: "complete" as const,
    title: "Product bundle",
    icon: "tag",
  },
];

export function createBarOfKind(kind: BundleBar["kind"]): BundleBar {
  switch (kind) {
    case "complete":
      return createBar({
        kind: "complete",
        title: "Complete the bundle",
        subtitle: "Save {{saved_total}}!",
        priceType: "percentage",
        discountValue: 20,
        selectedByDefault: true,
        products: [createDefaultBarProduct()],
      });
    case "quantity_break":
      return createBar({
        kind: "quantity_break",
        quantity: 2,
        priceType: "percentage",
        discountValue: 15,
        title: "Duo",
        subtitle: "You save {{saved_percentage}}",
        label: "SAVE {{saved_total}}",
        selectedByDefault: true,
      });
    case "bogo":
      return createBar({
        kind: "bogo",
        quantity: 3,
        buyQty: 3,
        getQty: 1,
        priceType: "full",
        getPriceType: "percentage",
        getDiscountValue: 100,
        title: "Buy 3, get 1 free!",
        subtitle: "You save {{saved_percentage}}",
        label: "SAVE {{saved_total}}",
        selectedByDefault: true,
      });
    default:
      return createBar({
        kind: "product",
        title: "{{product}}",
        subtitle: "Standard price",
      });
  }
}

export function createDealBadge(overrides: Partial<DealBadge> = {}): DealBadge {
  return {
    id: `badge-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    style: "simple",
    barId: "",
    text: "MOST POPULAR",
    textSize: 12,
    textColor: "#ffffff",
    backgroundColor: "#000000",
    size: 102,
    position: "all",
    thickness: 16,
    distance: 8,
    textSpacing: 0,
    repeatText: true,
    delimiterEnabled: true,
    delimiter: "·",
    animate: true,
    speed: 40,
    direction: "clockwise",
    imageUrl: "",
    ...overrides,
  };
}

export function defaultBarsForBundleType(typeId: string): BundleBar[] {
  const first = createBar({
    kind: "product",
    title: "Single",
    subtitle: "Standard price",
    priceType: "full",
    discountValue: 0,
  });

  const second = (() => {
    if (typeId === "quantity_break") return createBarOfKind("quantity_break");
    if (typeId === "bogo") return createBarOfKind("bogo");
    if (typeId === "mix_match") {
      return createBar({
        kind: "complete",
        title: "Mix & match",
        subtitle: "Save {{saved_total}}!",
        priceType: "percentage",
        discountValue: 20,
        selectedByDefault: true,
        products: [createDefaultBarProduct()],
      });
    }
    if (typeId === "fbt_upsell") {
      return createBar({
        kind: "complete",
        title: "Bought together",
        subtitle: "Save {{saved_total}}!",
        priceType: "percentage",
        discountValue: 15,
        selectedByDefault: true,
        products: [createDefaultBarProduct()],
      });
    }
    if (typeId === "gifts") {
      return createBar({
        kind: "complete",
        title: "Unlock gifts",
        subtitle: "Save {{saved_total}}!",
        priceType: "percentage",
        discountValue: 10,
        selectedByDefault: true,
        products: [createDefaultBarProduct()],
      });
    }
    return createBarOfKind("complete");
  })();

  return [first, second];
}

export function createOfferItem(overrides: Partial<OfferItem> = {}): OfferItem {
  return {
    id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    productId: "",
    variantId: "",
    title: "",
    quantity: 1,
    role: "pool",
    selectedByDefault: false,
    ...overrides,
  };
}

export const DEFAULT_BUNDLE_EDITOR_STATE: BundleEditorState = {
  internalName: "Bundle",
  blockTitle: "BUNDLE & SAVE",
  discountName: "Bundle savings",
  bundleTypeId: "quantity_break",
  productScope: "all",
  selectedProductIds: [],
  selectedCollectionIds: [],
  exceptionProductIds: [],
  exceptionCollectionIds: [],
  offerItems: [],
  minItems: 2,
  maxItems: null,
  bogoBuyQty: 1,
  bogoGetQty: 1,
  bogoMaxRedemptions: 1,
  fbtMode: "addons",
  fbtMinSelect: 2,
  giftThresholdType: "subtotal",
  giftThresholdValue: 50,
  giftFreeShipping: false,
  placement: "product",
  settings: {
    markets: "All",
    excludeB2b: false,
    b2bOnly: false,
    discountViaWidgetOnly: false,
    timezone: "UTC",
    startDate: new Date().toISOString().slice(0, 10),
    startTime: "00:00",
    hasEndDate: false,
    endDate: "",
    endTime: "23:59",
    variantSelection: true,
    showVariantSingleBar: true,
    hideThemeVariantPicker: false,
    hideUnavailableVariants: false,
    syncVariantSelection: false,
    useCompareAtPrice: true,
    showPricePerItem: false,
    showPriceWithoutDecimals: false,
    priceRounding: false,
    updateThemePrice: false,
    skipCartCheckout: false,
    lowStockAlert: false,
  },
  style: {
    layout: "vertical",
    cornerRadius: 8,
    spacing: 8,
    cardsBg: "#f6f6f7",
    selectedBg: "#ffffff",
    inactiveText: "#202223",
    buttonBg: "#1a1a1a",
    buttonText: "#ffffff",
    borderColor: "#e1e3e5",
    blockTitleColor: "#202223",
    titleColor: "#202223",
    subtitleColor: "#6d7175",
    priceColor: "#202223",
    fullPriceColor: "#8c9196",
    labelBg: "#e3e3e3",
    labelText: "#202223",
    badgeBg: "#e3e3e3",
    badgeText: "#202223",
    giftBg: "#e3e3e3",
    giftText: "#202223",
    giftSelectedBg: "#202223",
    giftSelectedText: "#ffffff",
    upsellBg: "#f6f6f7",
    upsellText: "#202223",
    upsellSelectedBg: "#e3e3e3",
    upsellSelectedText: "#202223",
    blockTitleSize: 14,
    titleSize: 20,
    subtitleSize: 14,
    labelSize: 12,
    giftSize: 13,
    upsellSize: 13,
    unitLabelSize: 14,
    blockTitleWeight: "bold",
    titleWeight: "bold",
    subtitleWeight: "regular",
    labelWeight: "regular",
    giftWeight: "bold",
    upsellWeight: "bold",
    unitLabelWeight: "regular",
    customCssEnabled: false,
    customCssScope: "this",
    customCss: "",
  },
  bars: defaultBarsForBundleType("quantity_break"),
  badges: [],
  badgesEnabled: true,
  features: {
    volumeDiscountOtherProducts: false,
    countdownTimer: {
      enabled: false,
      mode: "fixed",
      durationMinutes: 15,
      customEndDate: "",
      title: "Hurry! Offer expires in {{timer}} ⏰",
      backgroundColor: "#f6f6f7",
      textColor: "#202223",
      alignment: "center",
      bold: false,
      italic: false,
      fontSize: 13,
    },
    scratchOff: false,
    subscriptions: false,
    checkboxUpsells: false,
    progressiveGifts: false,
  },
  previewCountry: "Canada",
};

function barsForBundleType(type: BundleTypeDefinition): BundleBar[] {
  return defaultBarsForBundleType(type.id);
}

export function createEditorStateForBundleType(
  typeId: string,
): BundleEditorState {
  const type = getBundleType(typeId);
  if (!type) return { ...DEFAULT_BUNDLE_EDITOR_STATE };

  const features = { ...DEFAULT_BUNDLE_EDITOR_STATE.features };
  if (type.id === "gifts") features.progressiveGifts = true;
  if (type.id === "fbt_upsell") features.checkboxUpsells = true;

  return {
    ...DEFAULT_BUNDLE_EDITOR_STATE,
    bundleTypeId: type.id,
    internalName: type.defaultTitle,
    blockTitle: type.defaultTitle.toUpperCase(),
    bars: barsForBundleType(type),
    features,
    placement: type.id === "gifts" ? "cart" : "product",
    giftFreeShipping: type.id === "gifts",
    minItems: type.id === "mix_match" ? 2 : 2,
  };
}

export function editorStateFromBundle(
  bundle: {
    title: string;
    type?: string;
    layout?: string;
    widgetOverrides: unknown;
    tiers: Array<{
      minQuantity: number;
      discountType: string;
      discountValue: unknown;
      label: string | null;
    }>;
  },
): BundleEditorState {
  const stored = bundle.widgetOverrides as Partial<BundleEditorState> | null;
  const resolvedType = resolveBundleTypeId(
    stored?.bundleTypeId || bundle.type || "quantity_break",
    bundle.layout,
  );
  if (stored && stored.bars) {
    return {
      ...DEFAULT_BUNDLE_EDITOR_STATE,
      ...stored,
      internalName: stored.internalName ?? bundle.title,
      bundleTypeId: resolvedType,
      offerItems: stored.offerItems ?? [],
      exceptionCollectionIds: stored.exceptionCollectionIds ?? [],
      settings: { ...DEFAULT_BUNDLE_EDITOR_STATE.settings, ...stored.settings },
      style: { ...DEFAULT_BUNDLE_EDITOR_STATE.style, ...stored.style },
      features: {
        ...DEFAULT_BUNDLE_EDITOR_STATE.features,
        ...stored.features,
        countdownTimer: {
          ...DEFAULT_BUNDLE_EDITOR_STATE.features.countdownTimer,
          ...stored.features?.countdownTimer,
        },
      },
      bars: stored.bars.map((bar) =>
        createBar({
          ...(bar as Partial<import("../types/bundle-editor").BundleBar>),
          isPopular: false,
        }),
      ),
      badges: migrateBadges(
        stored.badges,
        stored.bars as BundleBar[],
        stored.badgesEnabled,
      ),
      badgesEnabled: stored.badgesEnabled !== false,
    };
  }

  const bars =
    bundle.tiers.length > 0
      ? bundle.tiers.map((tier, index) =>
          createBar({
            quantity: tier.minQuantity,
            priceType:
              tier.discountType === "percentage" ? "percentage" : "fixed",
            discountValue: Number(tier.discountValue),
            title: tier.label ?? `Bar #${index + 1}`,
            subtitle: "",
            isPopular: index === 1,
            selectedByDefault: index === 0,
          }),
        )
      : DEFAULT_BUNDLE_EDITOR_STATE.bars;

  return {
    ...DEFAULT_BUNDLE_EDITOR_STATE,
    internalName: bundle.title,
    bars,
    badges: migrateBadges(undefined, bars, true),
    badgesEnabled: true,
  };
}

function migrateBadges(
  stored: DealBadge[] | undefined,
  bars: Array<Partial<BundleBar>>,
  enabled = true,
): DealBadge[] {
  if (stored?.length) {
    return stored.map((badge) => createDealBadge(badge));
  }
  if (!enabled) return [];
  return bars
    .filter((bar) => bar.isPopular && bar.id)
    .map((bar) =>
      createDealBadge({
        style: "popular" as OverlayBadgeStyle,
        barId: bar.id,
        text: "Most Popular",
      }),
    );
}
