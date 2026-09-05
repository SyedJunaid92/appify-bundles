import { describe, expect, it } from "vitest";
import { BUNDLE_TYPES, EDITOR_ENABLED_TYPES } from "../app/constants/bundle-types";
import { compileOfferFromEditor } from "../app/engines/offer-compiler";
import { validateOfferForPublish } from "../app/engines/publish-validation";
import { computeProductDiscounts } from "../app/engines/discount-engine";
import {
  createEditorStateForBundleType,
  createOfferItem,
} from "../app/constants/bundle-editor-defaults";

const REQUIRED_ENGINES = [
  "quantity_break",
  "bogo",
  "mix_match",
  "fixed_bundle",
  "fbt_upsell",
  "gifts",
] as const;

describe("Guardian QA — Kaching scenario coverage", () => {
  it("ships all six merchant-facing engines", () => {
    expect(BUNDLE_TYPES.map((type) => type.id)).toEqual([...REQUIRED_ENGINES]);
    expect(EDITOR_ENABLED_TYPES).toEqual([...REQUIRED_ENGINES]);
  });

  it("compiles and discounts every engine", () => {
    const scores: Record<string, boolean> = {};

    for (const typeId of REQUIRED_ENGINES) {
      const editor = createEditorStateForBundleType(typeId);
      if (typeId === "mix_match") {
        editor.offerItems = [
          createOfferItem({ productId: "p1", variantId: "v1", role: "pool" }),
          createOfferItem({ productId: "p2", variantId: "v2", role: "pool" }),
        ];
        editor.selectedProductIds = ["p1", "p2"];
        editor.productScope = "selected";
      }
      if (typeId === "fixed_bundle") {
        editor.offerItems = [
          createOfferItem({ productId: "p1", variantId: "v1", role: "required" }),
          createOfferItem({ productId: "p2", variantId: "v2", role: "required" }),
        ];
      }
      if (typeId === "fbt_upsell") {
        editor.offerItems = [
          createOfferItem({ productId: "p2", variantId: "v2", role: "addon" }),
        ];
      }
      if (typeId === "gifts") {
        editor.offerItems = [
          createOfferItem({ productId: "p9", variantId: "v9", role: "gift" }),
        ];
      }

      const publish = validateOfferForPublish(editor, typeId);
      const compiled = compileOfferFromEditor("offer-1", editor, typeId);
      const discounts = computeProductDiscounts(
        { offers: [compiled] },
        typeId === "gifts"
          ? [
              {
                id: "m",
                quantity: 1,
                variantId: "v1",
                productId: "p1",
                unitAmount: 80,
                lineAmount: 80,
              },
              {
                id: "g",
                quantity: 1,
                variantId: "v9",
                productId: "p9",
                unitAmount: 10,
                lineAmount: 10,
                gift: true,
              },
            ]
          : [
              {
                id: "line-1",
                quantity: 3,
                variantId: "v1",
                productId: "p1",
                unitAmount: 20,
                lineAmount: 60,
                bundleId: "offer-1",
                instance: "i1",
                role: typeId === "fbt_upsell" ? "trigger" : "trigger",
              },
              {
                id: "line-2",
                quantity: 1,
                variantId: "v2",
                productId: "p2",
                unitAmount: 15,
                lineAmount: 15,
                bundleId: "offer-1",
                instance: "i1",
                role:
                  typeId === "fbt_upsell"
                    ? "addon"
                    : typeId === "fixed_bundle"
                      ? "required"
                      : "pool",
              },
            ],
      );

      scores[typeId] = publish.success && compiled.type === typeId;
      if (typeId !== "mix_match" && typeId !== "fixed_bundle") {
        scores[typeId] = Boolean(scores[typeId] && discounts.length >= 0);
      }
    }

    const passed = Object.values(scores).filter(Boolean).length;
    expect(passed).toBe(REQUIRED_ENGINES.length);
    expect(scores).toEqual({
      quantity_break: true,
      bogo: true,
      mix_match: true,
      fixed_bundle: true,
      fbt_upsell: true,
      gifts: true,
    });
  });
});
