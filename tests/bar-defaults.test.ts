import { describe, expect, it } from "vitest";
import {
  createEditorStateForBundleType,
  defaultBarsForBundleType,
} from "../app/constants/bundle-editor-defaults";
import { interpolateBarText } from "../app/utils/bundle-editor";
import type { PreviewProduct } from "../app/types/bundle-editor";

describe("defaultBarsForBundleType", () => {
  it("starts with a simple product bar for every type", () => {
    for (const typeId of [
      "quantity_break",
      "bogo",
      "mix_match",
      "fixed_bundle",
      "fbt_upsell",
      "gifts",
    ]) {
      const [first] = defaultBarsForBundleType(typeId);
      expect(first.kind).toBe("product");
      expect(first.priceType).toBe("full");
      expect(first.title).toBe("Single");
    }
  });

  it("uses the selected bundle type as the second bar", () => {
    expect(defaultBarsForBundleType("quantity_break")[1].kind).toBe(
      "quantity_break",
    );
    expect(defaultBarsForBundleType("bogo")[1].kind).toBe("bogo");
    expect(defaultBarsForBundleType("fixed_bundle")[1].kind).toBe("complete");
    expect(defaultBarsForBundleType("mix_match")[1].title).toBe("Mix & match");
    expect(createEditorStateForBundleType("quantity_break").bars[1].kind).toBe(
      "quantity_break",
    );
  });
});

describe("grouped bar variables", () => {
  const product: PreviewProduct = {
    id: "p1",
    title: "Shirt",
    variantId: "v1",
    variantTitle: "Blue / Large",
    price: 100,
    compareAtPrice: 150,
    currencyCode: "CAD",
    metafields: ["Organic", "Cotton"],
  };
  const pricing = {
    savings: 70,
    savingsPercent: 47,
    saleTotal: 80,
    compareTotal: 150,
    perItem: 80,
  };

  it("interpolates grouped discount and product tokens", () => {
    const text = interpolateBarText(
      "{{product}} {{variant}} {{saved_percentage}} {{sale_total}} {{original_total}}",
      product,
      pricing,
      "CAD",
      true,
      1,
    );
    expect(text).toContain("Shirt");
    expect(text).toContain("Blue / Large");
    expect(text).toContain("47%");
    expect(text).toContain("$80.00");
    expect(text).toContain("$150.00");
  });

  it("interpolates quantity and metafield tokens", () => {
    const text = interpolateBarText(
      "{{buy_qty}}/{{get_qty}} {{metafield_1}}",
      product,
      pricing,
      "CAD",
      true,
      4,
      { buyQty: 3, getQty: 1 },
    );
    expect(text).toBe("3/1 Organic");
  });
});
