import { describe, expect, it } from "vitest";
import {
  assignExperimentVariant,
  parseExperimentCookie,
} from "../app/engines/ab-assign";
import {
  isProductInOfferScope,
  isScheduleActive,
  isB2bEligible,
} from "../app/engines/targeting";
import { compileOfferFromEditor } from "../app/engines/offer-compiler";
import { validateOfferForPublish } from "../app/engines/publish-validation";
import { DEFAULT_BUNDLE_EDITOR_STATE } from "../app/constants/bundle-editor-defaults";
import { createOfferItem } from "../app/constants/bundle-editor-defaults";

describe("A/B assignment", () => {
  it("is sticky for the same seed", () => {
    const a = assignExperimentVariant(50, "visitor-1:exp");
    const b = assignExperimentVariant(50, "visitor-1:exp");
    expect(a).toBe(b);
    expect(parseExperimentCookie("challenger")).toBe("challenger");
    expect(parseExperimentCookie("nope")).toBeNull();
  });
});

describe("targeting", () => {
  it("respects collection exceptions and selected products", () => {
    expect(
      isProductInOfferScope(
        {
          sc: "sel",
          p: ["gid://shopify/Product/1"],
          c: [],
          xp: ["gid://shopify/Product/2"],
          xc: [],
        },
        { productId: "1" },
      ),
    ).toBe(true);
    expect(
      isProductInOfferScope(
        {
          sc: "sel",
          p: ["gid://shopify/Product/1"],
          c: [],
          xp: ["gid://shopify/Product/1"],
          xc: [],
        },
        { productId: "gid://shopify/Product/1" },
      ),
    ).toBe(false);
  });

  it("hides offers before the start date", () => {
    expect(
      isScheduleActive(
        { startDate: "2099-01-01", startTime: "00:00", hasEndDate: false },
        new Date("2026-01-01"),
      ),
    ).toBe(false);
  });

  it("enforces B2B flags", () => {
    expect(isB2bEligible({ xb2b: true, b2b: false }, true)).toBe(false);
    expect(isB2bEligible({ xb2b: false, b2b: true }, false)).toBe(false);
    expect(isB2bEligible({ xb2b: false, b2b: false }, true)).toBe(true);
  });
});

describe("publish validation", () => {
  it("requires mix and match minimums", () => {
    const result = validateOfferForPublish({
      ...DEFAULT_BUNDLE_EDITOR_STATE,
      bundleTypeId: "mix_match",
      productScope: "selected",
      selectedProductIds: ["p1"],
      minItems: 1,
      offerItems: [createOfferItem({ productId: "p1", variantId: "v1" })],
    });
    expect(result.success).toBe(false);
  });

  it("compiles a compact offer", () => {
    const compiled = compileOfferFromEditor("b1", {
      ...DEFAULT_BUNDLE_EDITOR_STATE,
      bundleTypeId: "gifts",
      giftThresholdValue: 75,
      giftFreeShipping: true,
    });
    expect(compiled.type).toBe("gifts");
    expect(compiled.gift).toEqual({ by: "$", min: 75, ship: true });
  });
});
