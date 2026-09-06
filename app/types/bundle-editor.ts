export type ProductScope = "all" | "selected" | "collections";

export type PriceType = "full" | "percentage" | "fixed" | "flat" | "free";

export type OfferItemRole =
  | "trigger"
  | "required"
  | "optional"
  | "addon"
  | "reward"
  | "gift"
  | "pool";

export type B2bMode = "off" | "exclude" | "only";

export type GiftThresholdType = "subtotal" | "quantity";

export type OfferPlacement = "product" | "cart" | "both";

export type FbtMode = "addons" | "combo";

export interface ProductOptionAxis {
  name: string;
  values: string[];
}

export interface ProductOptionVariant {
  id: string;
  available?: boolean;
  options: string[];
}

export interface OfferItem {
  id: string;
  productId: string;
  variantId: string;
  handle?: string;
  title: string;
  variantTitle?: string;
  imageUrl?: string;
  price?: number;
  compareAtPrice?: number;
  quantity: number;
  role: OfferItemRole;
  selectedByDefault: boolean;
  discountType?: "percentage" | "fixed";
  discountValue?: number;
  options?: ProductOptionAxis[];
  variants?: ProductOptionVariant[];
}

export type BarKind = "product" | "quantity_break" | "complete" | "bogo";

export type CompleteLayout = "stack" | "grid";

export interface BarProduct {
  id: string;
  productId: string;
  variantId: string;
  handle?: string;
  title: string;
  imageUrl?: string;
  price?: number;
  compareAtPrice?: number;
  quantity: number;
  priceType: PriceType;
  discountValue: number;
  hidePrice: boolean;
  titleTemplate: string;
  isDefault: boolean;
  options?: ProductOptionAxis[];
  variants?: ProductOptionVariant[];
}

export type FontWeightStyle = "regular" | "medium" | "bold";

export type BadgeStyle = "simple" | "ribbon";

export type OverlayBadgeStyle = "simple" | "popular" | "border" | "custom";

export type BadgePosition = "all" | "top" | "bottom" | "left" | "right";

export type BadgeDirection = "clockwise" | "counterclockwise";

export type EditorPanel = "deal" | "settings" | "style" | "bar";

export interface DealBadge {
  id: string;
  style: OverlayBadgeStyle;
  barId: string;
  text: string;
  textSize: number;
  textColor: string;
  backgroundColor: string;
  size: number;
  position: BadgePosition;
  thickness: number;
  distance: number;
  textSpacing: number;
  repeatText: boolean;
  delimiterEnabled: boolean;
  delimiter: string;
  animate: boolean;
  speed: number;
  direction: BadgeDirection;
  imageUrl?: string;
}

export interface BarImage {
  url?: string;
  size: number;
}

export interface BarUpsell {
  productMode: "selected" | "complementary";
  productId?: string;
  productTitle?: string;
  variantId?: string;
  imageUrl?: string;
  priceType: "percentage" | "fixed";
  discountValue: number;
  text: string;
  imageSize: number;
  selectedByDefault: boolean;
  visibleWhenSelected: boolean;
  enableSubscription: boolean;
  subscriptionMode: string;
}

export interface BarGift {
  id: string;
  type: "product" | "shipping";
  productId?: string;
  productTitle?: string;
  variantId?: string;
  imageUrl?: string;
  text: string;
  imageSize: number;
  showOriginalPrice: boolean;
  includeInCompareAt: boolean;
  subscriptionsOnly: boolean;
}

export interface BarPersonalisation {
  label: string;
  placeholder: string;
  required: boolean;
  maxLength: number;
}

export interface BarHighlightItem {
  id: string;
  text: string;
}

export interface BarHighlights {
  items: BarHighlightItem[];
  layout: "vertical" | "horizontal";
  showOnlyWhenSelected: boolean;
  size: number;
  textColor: string;
  iconType: "checkmark" | "star" | "dot";
  iconColor: string;
}

export interface PickedProduct {
  id: string;
  title: string;
  variantId: string;
  handle?: string;
  imageUrl?: string;
  price?: number;
  compareAtPrice?: number;
  options?: ProductOptionAxis[];
  variants?: ProductOptionVariant[];
}

export interface PreviewProduct {
  id: string;
  title: string;
  imageUrl?: string;
  variantId: string;
  variantTitle?: string;
  price: number;
  compareAtPrice?: number;
  currencyCode: string;
  metafields?: string[];
  options?: ProductOptionAxis[];
}

export interface BundleBar {
  id: string;
  kind: BarKind;
  quantity: number;
  priceType: PriceType;
  discountValue: number;
  title: string;
  subtitle: string;
  badgeText: string;
  label: string;
  badgeStyle: BadgeStyle;
  isPopular: boolean;
  selectedByDefault: boolean;
  showQuantitySelector: boolean;
  requireVariantSelection: boolean;
  showProductsOnlyWhenSelected: boolean;
  applySellingPlan: boolean;
  soldOut: boolean;
  showProductCard: boolean;
  completeLayout: CompleteLayout;
  buyQty: number;
  getQty: number;
  getPriceType: PriceType;
  getDiscountValue: number;
  products: BarProduct[];
  image?: BarImage | null;
  upsell?: BarUpsell | null;
  gifts?: BarGift[];
  personalisation?: BarPersonalisation | null;
  highlights?: BarHighlights | null;
}

export interface BundleEditorSettings {
  markets: string;
  excludeB2b: boolean;
  b2bOnly: boolean;
  discountViaWidgetOnly: boolean;
  timezone: string;
  startDate: string;
  startTime: string;
  hasEndDate: boolean;
  endDate: string;
  endTime: string;
  variantSelection: boolean;
  showVariantSingleBar: boolean;
  hideThemeVariantPicker: boolean;
  hideUnavailableVariants: boolean;
  syncVariantSelection: boolean;
  useCompareAtPrice: boolean;
  showPricePerItem: boolean;
  showPriceWithoutDecimals: boolean;
  priceRounding: boolean;
  updateThemePrice: boolean;
  skipCartCheckout: boolean;
  lowStockAlert: boolean;
}

export interface BundleEditorStyle {
  layout: "vertical" | "horizontal" | "compact" | "minimal";
  cornerRadius: number;
  spacing: number;
  cardsBg: string;
  selectedBg: string;
  inactiveText: string;
  buttonBg: string;
  buttonText: string;
  borderColor: string;
  blockTitleColor: string;
  titleColor: string;
  subtitleColor: string;
  priceColor: string;
  fullPriceColor: string;
  labelBg: string;
  labelText: string;
  badgeBg: string;
  badgeText: string;
  giftBg: string;
  giftText: string;
  giftSelectedBg: string;
  giftSelectedText: string;
  upsellBg: string;
  upsellText: string;
  upsellSelectedBg: string;
  upsellSelectedText: string;
  blockTitleSize: number;
  titleSize: number;
  subtitleSize: number;
  labelSize: number;
  giftSize: number;
  upsellSize: number;
  unitLabelSize: number;
  blockTitleWeight: FontWeightStyle;
  titleWeight: FontWeightStyle;
  subtitleWeight: FontWeightStyle;
  labelWeight: FontWeightStyle;
  giftWeight: FontWeightStyle;
  upsellWeight: FontWeightStyle;
  unitLabelWeight: FontWeightStyle;
  customCssEnabled: boolean;
  customCssScope: "all" | "this";
  customCss: string;
}

export interface CountdownTimerConfig {
  enabled: boolean;
  mode: "fixed" | "midnight" | "custom";
  durationMinutes: number;
  customEndDate: string;
  title: string;
  backgroundColor: string;
  textColor: string;
  alignment: "left" | "center" | "right";
  bold: boolean;
  italic: boolean;
  fontSize: number;
}

export interface BundleEditorFeatures {
  volumeDiscountOtherProducts: boolean;
  countdownTimer: CountdownTimerConfig;
  scratchOff: boolean;
  subscriptions: boolean;
  checkboxUpsells: boolean;
  progressiveGifts: boolean;
}

export interface BundleEditorState {
  internalName: string;
  blockTitle: string;
  discountName: string;
  bundleTypeId: string;
  productScope: ProductScope;
  selectedProductIds: string[];
  selectedCollectionIds: string[];
  exceptionProductIds: string[];
  exceptionCollectionIds: string[];
  offerItems: OfferItem[];
  minItems: number;
  maxItems: number | null;
  bogoBuyQty: number;
  bogoGetQty: number;
  bogoMaxRedemptions: number;
  fbtMode: FbtMode;
  fbtMinSelect: number;
  giftThresholdType: GiftThresholdType;
  giftThresholdValue: number;
  giftFreeShipping: boolean;
  placement: OfferPlacement;
  settings: BundleEditorSettings;
  style: BundleEditorStyle;
  bars: BundleBar[];
  badges: DealBadge[];
  badgesEnabled: boolean;
  features: BundleEditorFeatures;
  previewProductId?: string;
  previewCountry: string;
}

export interface SerializedBundleEditor extends BundleEditorState {
  previewProducts: PreviewProduct[];
}
