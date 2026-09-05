import type { BundleEditorState, OfferItem, PriceType } from "../types/bundle-editor";
import { createOfferItem } from "../constants/bundle-editor-defaults";

function toItemDiscount(priceType: PriceType, discountValue: number) {
  if (priceType === "percentage") {
    return { discountType: "percentage" as const, discountValue };
  }
  if (priceType === "fixed" || priceType === "flat") {
    return { discountType: "fixed" as const, discountValue };
  }
  if (priceType === "free") {
    return { discountType: "percentage" as const, discountValue: 100 };
  }
  return {};
}

export function offerItemsFromCompleteBars(state: BundleEditorState): OfferItem[] {
  const items: OfferItem[] = [];
  for (const bar of state.bars) {
    if (bar.kind !== "complete") continue;
    for (const product of bar.products ?? []) {
      if (product.isDefault || !product.productId || !product.variantId) continue;
      items.push(
        createOfferItem({
          productId: product.productId,
          variantId: product.variantId,
          title: product.title,
          imageUrl: product.imageUrl,
          price: product.price,
          quantity: product.quantity || 1,
          role: "addon",
          selectedByDefault: true,
          ...toItemDiscount(product.priceType, product.discountValue),
        }),
      );
    }
  }
  return items;
}

export function mergedOfferItems(state: BundleEditorState): OfferItem[] {
  const fromBars = offerItemsFromCompleteBars(state);
  const existing = state.offerItems ?? [];
  if (fromBars.length === 0) return existing;
  const seen = new Set(existing.map((item) => item.variantId).filter(Boolean));
  return [
    ...existing,
    ...fromBars.filter((item) => item.variantId && !seen.has(item.variantId)),
  ];
}

export function completeBarDiscount(state: BundleEditorState) {
  const bar = state.bars.find((item) => item.kind === "complete");
  if (!bar) return null;
  const defaultProduct = (bar.products ?? []).find((item) => item.isDefault);
  return {
    priceType: defaultProduct?.priceType || bar.priceType,
    discountValue: defaultProduct?.discountValue ?? bar.discountValue,
  };
}
