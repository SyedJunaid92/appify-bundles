import type { BundleEditorState } from "../types/bundle-editor";
import { resolveBundleTypeId } from "../constants/bundle-types";
import { offerItemsFromCompleteBars } from "../utils/complete-bundle";
import { MAX_ITEMS_PER_OFFER, MAX_TIERS_PER_OFFER } from "./offer";

export function validateOfferForPublish(
  editor: BundleEditorState,
  typeId?: string,
): { success: true } | { success: false; error: string } {
  const type = resolveBundleTypeId(editor.bundleTypeId || typeId || "quantity_break");

  if (!editor.internalName?.trim()) {
    return { success: false, error: "Internal name is required." };
  }
  if (!editor.blockTitle?.trim()) {
    return { success: false, error: "Block title is required." };
  }

  if (
    editor.productScope === "selected" &&
    editor.selectedProductIds.length === 0 &&
    type !== "gifts"
  ) {
    return { success: false, error: "Select at least one product." };
  }
  if (
    editor.productScope === "collections" &&
    editor.selectedCollectionIds.length === 0
  ) {
    return { success: false, error: "Select at least one collection." };
  }

  if (editor.bars.length > MAX_TIERS_PER_OFFER) {
    return {
      success: false,
      error: `A deal can have at most ${MAX_TIERS_PER_OFFER} pricing bars.`,
    };
  }
  if (editor.offerItems.length > MAX_ITEMS_PER_OFFER) {
    return {
      success: false,
      error: `A deal can have at most ${MAX_ITEMS_PER_OFFER} products.`,
    };
  }

  if (editor.bars.some((bar) => !bar.title?.trim())) {
    return { success: false, error: "Title is required" };
  }

  if (type === "quantity_break") {
    if (editor.bars.length < 1) {
      return { success: false, error: "Add at least one pricing bar." };
    }
    const hasDeal = editor.bars.some(
      (bar) =>
        (bar.priceType !== "full" && bar.discountValue > 0) ||
        bar.kind === "complete" ||
        bar.kind === "bogo",
    );
    if (!hasDeal) {
      return { success: false, error: "Add a discounted quantity bar." };
    }
  }

  if (type === "bogo") {
    const bogoBar = editor.bars.find((bar) => bar.kind === "bogo");
    const buy = bogoBar?.buyQty || editor.bogoBuyQty || 0;
    const get = bogoBar?.getQty || editor.bogoGetQty || 0;
    if (buy < 1 || get < 1) {
      return { success: false, error: "Buy and get quantities must be at least 1." };
    }
  }

  if (type === "mix_match") {
    if ((editor.minItems || 0) < 2) {
      return { success: false, error: "Mix & match requires at least 2 items." };
    }
    if (editor.offerItems.length < 2 && editor.productScope === "selected") {
      return { success: false, error: "Add at least two products to the pool." };
    }
  }

  if (type === "fixed_bundle") {
    const complements = offerItemsFromCompleteBars(editor);
    const required = editor.offerItems.filter((item) => item.role === "required");
    if (complements.length === 0 && editor.offerItems.length < 2) {
      return {
        success: false,
        error: "Add at least one complementary product to Complete the bundle.",
      };
    }
    if (complements.length === 0 && required.length === 0) {
      return { success: false, error: "Mark at least one item as required." };
    }
  }

  if (type === "fbt_upsell") {
    if (!editor.offerItems.some((item) => item.role === "addon")) {
      return { success: false, error: "Add at least one frequently bought together product." };
    }
  }

  if (type === "gifts") {
    const hasGift = editor.offerItems.some((item) => item.role === "gift");
    if (!hasGift && !editor.giftFreeShipping) {
      return { success: false, error: "Add a gift product or enable free shipping." };
    }
    if ((editor.giftThresholdValue || 0) <= 0) {
      return { success: false, error: "Set a gift unlock threshold." };
    }
  }

  return { success: true };
}
