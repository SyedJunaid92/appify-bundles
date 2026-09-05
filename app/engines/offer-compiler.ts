import type { BundleEditorState, OfferItem, PriceType } from "../types/bundle-editor";
import { resolveBundleTypeId } from "../constants/bundle-types";
import { completeBarDiscount, mergedOfferItems } from "../utils/complete-bundle";
import {
  MAX_ACTIVE_OFFERS,
  MAX_ITEMS_PER_OFFER,
  MAX_TIERS_PER_OFFER,
  type CompiledOffer,
  type CompiledOffersPayload,
  type OfferPriceType,
} from "./offer";

function toPriceType(priceType: PriceType | string): OfferPriceType {
  if (priceType === "fixed") return "f";
  if (priceType === "flat") return "l";
  if (priceType === "free") return "r";
  if (priceType === "full") return "full";
  return "p";
}

function compactItems(items: OfferItem[] = []) {
  return items.slice(0, MAX_ITEMS_PER_OFFER).map((item) => ({
    v: item.variantId,
    p: item.productId,
    r: item.role,
    t: item.discountType ? toPriceType(item.discountType) : undefined,
    d: item.discountValue,
  }));
}

export function compileOfferFromEditor(
  bundleId: string,
  editor: BundleEditorState,
  fallbackType?: string,
): CompiledOffer {
  const type = resolveBundleTypeId(editor.bundleTypeId || fallbackType || "quantity_break");
  const scope =
    editor.productScope === "collections"
      ? "col"
      : editor.productScope === "selected"
        ? "sel"
        : "all";

  const items = mergedOfferItems(editor);
  const completeDiscount = completeBarDiscount(editor);
  const bogoBar = editor.bars.find((bar) => bar.kind === "bogo");
  const tiers = editor.bars.slice(0, MAX_TIERS_PER_OFFER).map((bar) => {
    const priceType =
      bar.kind === "complete" && completeDiscount
        ? completeDiscount.priceType
        : bar.priceType;
    const discountValue =
      bar.kind === "complete" && completeDiscount
        ? completeDiscount.discountValue
        : bar.discountValue;
    return {
      q: bar.kind === "bogo" ? bar.buyQty || bar.quantity : bar.quantity,
      t: toPriceType(priceType),
      v: priceType === "full" || priceType === "free" ? 0 : Number(discountValue) || 0,
      fp: priceType === "flat" ? Number(discountValue) || 0 : null,
      k: bar.kind,
    };
  });

  return {
    id: bundleId,
    type,
    name: editor.discountName || editor.blockTitle || editor.internalName || "Bundle savings",
    wo: Boolean(editor.settings?.discountViaWidgetOnly),
    xb2b: Boolean(editor.settings?.excludeB2b),
    b2b: Boolean(editor.settings?.b2bOnly),
    sc: scope,
    p: editor.selectedProductIds ?? [],
    c: editor.selectedCollectionIds ?? [],
    xp: editor.exceptionProductIds ?? [],
    xc: editor.exceptionCollectionIds ?? [],
    tiers,
    items: compactItems(items),
    bogo:
      type === "bogo" || bogoBar
        ? {
            b: bogoBar?.buyQty || editor.bogoBuyQty || editor.bars[0]?.quantity || 1,
            g: bogoBar?.getQty || editor.bogoGetQty || 1,
            t:
              (bogoBar?.getPriceType || "percentage") === "percentage"
                ? "p"
                : "r",
            v: bogoBar?.getDiscountValue ?? 100,
            max: editor.bogoMaxRedemptions ?? 1,
          }
        : undefined,
    fbt:
      type === "fbt_upsell"
        ? { mode: editor.fbtMode || "addons", min: editor.fbtMinSelect || 2 }
        : undefined,
    gift:
      type === "gifts"
        ? {
            by: editor.giftThresholdType === "quantity" ? "q" : "$",
            min: Number(editor.giftThresholdValue) || 0,
            ship: Boolean(editor.giftFreeShipping),
          }
        : undefined,
  };
}

export function compileOffersPayload(
  offers: CompiledOffer[],
): CompiledOffersPayload {
  return { offers: offers.slice(0, MAX_ACTIVE_OFFERS) };
}

export function collectionIdsFromOffers(offers: CompiledOffer[]) {
  const ids = new Set<string>();
  for (const offer of offers) {
    for (const id of offer.c) ids.add(id);
    for (const id of offer.xc) ids.add(id);
  }
  return [...ids];
}
