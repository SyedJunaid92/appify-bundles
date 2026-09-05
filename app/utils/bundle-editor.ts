import type { BundleBar, BundleEditorState, PreviewProduct } from "../types/bundle-editor";

export function formatMoney(
  amount: number,
  currencyCode = "CAD",
  decimals = true,
): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: decimals ? 2 : 0,
    maximumFractionDigits: decimals ? 2 : 0,
  }).format(amount);
}

export function applyBarPrice(
  compare: number,
  priceType: BundleBar["priceType"],
  discountValue: number,
) {
  if (priceType === "percentage" && discountValue > 0) {
    return compare * (1 - discountValue / 100);
  }
  if (priceType === "fixed" && discountValue > 0) {
    return Math.max(0, compare - discountValue);
  }
  if (priceType === "flat" && discountValue > 0) {
    return Math.max(0, discountValue);
  }
  if (priceType === "free") return 0;
  return compare;
}

export function resolveProductPrices(
  product: { price: number; compareAtPrice?: number },
  useCompareAtPrice: boolean,
) {
  const sale = Number(product.price) || 0;
  const compareAt = Number(product.compareAtPrice) || 0;
  const compare = useCompareAtPrice && compareAt > 0 ? compareAt : sale;
  return { sale, compare };
}

export type BarTextExtras = {
  buyQty?: number;
  getQty?: number;
  giftCount?: number;
  sellingPlanName?: string;
  sellingPlanDiscount?: string;
};

export function interpolateBarText(
  template: string,
  product: PreviewProduct,
  pricing: {
    savings: number;
    savingsPercent: number;
    saleTotal: number;
    compareTotal?: number;
    perItem?: number;
  },
  currency: string,
  decimals: boolean,
  quantity = 1,
  extras: BarTextExtras = {},
) {
  const qty = Math.max(1, quantity);
  const compareTotal = pricing.compareTotal ?? pricing.saleTotal + pricing.savings;
  const saleTotal = pricing.saleTotal;
  const perItem = pricing.perItem ?? saleTotal / qty;
  const originalPerItem = compareTotal / qty;
  const savedPerItem = Math.max(0, originalPerItem - perItem);
  const metafields = product.metafields ?? [];
  const money = (amount: number) => formatMoney(amount, currency, decimals);

  return (template || "")
    .replaceAll("{{product}}", product.title)
    .replaceAll("{{variant}}", product.variantTitle || product.title)
    .replaceAll("{{saved_total}}", money(pricing.savings))
    .replaceAll("{{saved_percentage}}", `${pricing.savingsPercent}%`)
    .replaceAll("{{saved_amount}}", money(pricing.savings))
    .replaceAll("{{saved_per_item}}", money(savedPerItem))
    .replaceAll("{{sale_total}}", money(saleTotal))
    .replaceAll("{{sale_per_item}}", money(perItem))
    .replaceAll("{{sale_per_day}}", money(saleTotal / 30))
    .replaceAll("{{original_total}}", money(compareTotal))
    .replaceAll("{{original_per_item}}", money(originalPerItem))
    .replaceAll("{{currency}}", currency)
    .replaceAll("{{unit_price}}", money(perItem))
    .replaceAll("{{saved_per_unit}}", money(savedPerItem))
    .replaceAll("{{original_unit}}", money(originalPerItem))
    .replaceAll("{{unit_qty}}", String(qty))
    .replaceAll("{{quantity}}", String(qty))
    .replaceAll("{{buy_qty}}", String(extras.buyQty ?? qty))
    .replaceAll("{{get_qty}}", String(extras.getQty ?? 0))
    .replaceAll("{{gift_count}}", String(extras.giftCount ?? 0))
    .replaceAll("{{selling_plan}}", extras.sellingPlanName || "")
    .replaceAll("{{selling_plan_discount}}", extras.sellingPlanDiscount || "")
    .replaceAll("{{metafield_1}}", metafields[0] || "")
    .replaceAll("{{metafield_2}}", metafields[1] || "")
    .replaceAll("{{metafield_3}}", metafields[2] || "")
    .replaceAll("{{metafield_4}}", metafields[3] || "");
}

export function calculateBarPricing(
  bar: BundleBar,
  product: PreviewProduct,
  settings: BundleEditorState["settings"],
) {
  const { sale: unitSale, compare: unitCompare } = resolveProductPrices(
    product,
    settings.useCompareAtPrice,
  );

  if (bar.kind === "complete") {
    const complements = (bar.products ?? []).filter((item) => !item.isDefault);
    const mainProduct = (bar.products ?? []).find((item) => item.isDefault);
    const mainSale = applyBarPrice(
      unitSale,
      mainProduct?.priceType || bar.priceType,
      mainProduct?.discountValue ?? bar.discountValue,
    );
    let compareTotal = unitCompare;
    let saleTotal = mainSale;
    for (const item of complements) {
      const itemSale = (item.price || unitSale * 0.25) * (item.quantity || 1);
      const itemCompare =
        (item.compareAtPrice && settings.useCompareAtPrice
          ? item.compareAtPrice
          : item.price || unitCompare * 0.25) * (item.quantity || 1);
      compareTotal += itemCompare;
      saleTotal += applyBarPrice(
        itemSale,
        item.priceType || bar.priceType,
        item.discountValue ?? bar.discountValue,
      );
    }
    if (settings.priceRounding) saleTotal = Math.round(saleTotal);
    const savings = Math.max(0, compareTotal - saleTotal);
    return {
      compareTotal,
      saleTotal,
      savings,
      perItem: saleTotal,
      savingsPercent:
        compareTotal > 0 ? Math.round((savings / compareTotal) * 100) : 0,
    };
  }

  if (bar.kind === "bogo") {
    const buy = bar.buyQty || bar.quantity || 1;
    const get = bar.getQty || 1;
    const compareTotal = unitCompare * (buy + get);
    const getSale = applyBarPrice(
      unitSale * get,
      bar.getPriceType || "percentage",
      bar.getDiscountValue ?? 100,
    );
    let saleTotal = unitSale * buy + getSale;
    if (settings.priceRounding) saleTotal = Math.round(saleTotal);
    const savings = Math.max(0, compareTotal - saleTotal);
    return {
      compareTotal,
      saleTotal,
      savings,
      perItem: (buy + get) > 0 ? saleTotal / (buy + get) : saleTotal,
      savingsPercent:
        compareTotal > 0 ? Math.round((savings / compareTotal) * 100) : 0,
    };
  }

  const qty = bar.quantity || 1;
  const compareTotal = unitCompare * qty;
  let saleTotal = applyBarPrice(unitSale * qty, bar.priceType, bar.discountValue);
  if (settings.priceRounding) saleTotal = Math.round(saleTotal);
  const savings = Math.max(0, compareTotal - saleTotal);
  return {
    compareTotal,
    saleTotal,
    savings,
    perItem: qty > 0 ? saleTotal / qty : saleTotal,
    savingsPercent:
      compareTotal > 0 ? Math.round((savings / compareTotal) * 100) : 0,
  };
}

export function barsToTiers(bars: BundleBar[]) {
  return bars.map((bar, index) => ({
    minQuantity: bar.quantity,
    discountType:
      bar.priceType === "fixed" || bar.priceType === "flat"
        ? "fixed"
        : bar.priceType === "free"
          ? "percentage"
          : "percentage",
    discountValue:
      bar.priceType === "full" ? 0 : bar.priceType === "free" ? 100 : bar.discountValue,
    label: bar.title,
    sortOrder: index,
  }));
}

export function editorToWidgetOverrides(state: BundleEditorState) {
  const { previewProductId, previewCountry, ...rest } = state;
  return rest;
}
