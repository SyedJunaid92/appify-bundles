import { describe, expect, it } from "vitest";
import {
  calculateBarPricing,
  resolveProductPrices,
} from "../app/utils/bundle-editor";
import {
  createBar,
  createDefaultBarProduct,
  DEFAULT_BUNDLE_EDITOR_STATE,
} from "../app/constants/bundle-editor-defaults";
import type { PreviewProduct } from "../app/types/bundle-editor";

const product: PreviewProduct = {
  id: "p1",
  title: "Shirt",
  variantId: "v1",
  price: 100,
  compareAtPrice: 150,
  currencyCode: "CAD",
};

const settingsOn = {
  ...DEFAULT_BUNDLE_EDITOR_STATE.settings,
  useCompareAtPrice: true,
};
const settingsOff = {
  ...DEFAULT_BUNDLE_EDITOR_STATE.settings,
  useCompareAtPrice: false,
};

describe("resolveProductPrices", () => {
  it("shows compare-at when the setting is on and a compare-at exists", () => {
    expect(resolveProductPrices(product, true)).toEqual({
      sale: 100,
      compare: 150,
    });
  });

  it("shows the product price when the setting is off", () => {
    expect(resolveProductPrices(product, false)).toEqual({
      sale: 100,
      compare: 100,
    });
  });

  it("falls back to the product price when compare-at is missing", () => {
    expect(resolveProductPrices({ price: 100 }, true)).toEqual({
      sale: 100,
      compare: 100,
    });
  });
});

describe("calculateBarPricing", () => {
  it("discounts the selling price and strikes through compare-at when on", () => {
    const pricing = calculateBarPricing(
      createBar({
        kind: "product",
        quantity: 1,
        priceType: "percentage",
        discountValue: 20,
      }),
      product,
      settingsOn,
    );
    expect(pricing.saleTotal).toBe(80);
    expect(pricing.compareTotal).toBe(150);
    expect(pricing.savings).toBe(70);
  });

  it("discounts the selling price and strikes through product price when off", () => {
    const pricing = calculateBarPricing(
      createBar({
        kind: "product",
        quantity: 1,
        priceType: "percentage",
        discountValue: 20,
      }),
      product,
      settingsOff,
    );
    expect(pricing.saleTotal).toBe(80);
    expect(pricing.compareTotal).toBe(100);
    expect(pricing.savings).toBe(20);
  });

  it("uses compare-at only for BOGO display totals", () => {
    const bar = createBar({
      kind: "bogo",
      quantity: 1,
      buyQty: 1,
      getQty: 1,
      getPriceType: "percentage",
      getDiscountValue: 100,
    });
    const on = calculateBarPricing(bar, product, settingsOn);
    expect(on.saleTotal).toBe(100);
    expect(on.compareTotal).toBe(300);
    expect(on.savings).toBe(200);

    const off = calculateBarPricing(bar, product, settingsOff);
    expect(off.saleTotal).toBe(100);
    expect(off.compareTotal).toBe(200);
    expect(off.savings).toBe(100);
  });

  it("applies complete-bundle discounts to each item selling price", () => {
    const bar = createBar({
      kind: "complete",
      priceType: "percentage",
      discountValue: 20,
      products: [
        createDefaultBarProduct({
          isDefault: true,
          priceType: "percentage",
          discountValue: 20,
        }),
        createDefaultBarProduct({
          isDefault: false,
          title: "Belt",
          price: 25,
          compareAtPrice: 40,
          quantity: 1,
          priceType: "percentage",
          discountValue: 20,
        }),
      ],
    });

    const on = calculateBarPricing(bar, product, settingsOn);
    expect(on.saleTotal).toBe(100);
    expect(on.compareTotal).toBe(190);
    expect(on.savings).toBe(90);

    const off = calculateBarPricing(bar, product, settingsOff);
    expect(off.saleTotal).toBe(100);
    expect(off.compareTotal).toBe(125);
    expect(off.savings).toBe(25);
  });
});
