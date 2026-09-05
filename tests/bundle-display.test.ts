import { describe, expect, it } from "vitest";
import {
  formatBundleDiscountLabel,
  formatBundleTypeLabel,
} from "../app/utils/bundle-display";

describe("formatBundleDiscountLabel", () => {
  it("formats percentage discount", () => {
    expect(
      formatBundleDiscountLabel({
        discountType: "percentage",
        discountValue: 15,
        type: "quantity_break",
      }),
    ).toBe("15% off");
  });

  it("uses tier max when bundle discount is zero", () => {
    expect(
      formatBundleDiscountLabel({
        discountType: "percentage",
        discountValue: 0,
        type: "quantity_break",
        tiers: [
          { discountType: "percentage", discountValue: 10 },
          { discountType: "percentage", discountValue: 20 },
        ],
      }),
    ).toBe("20% off");
  });

  it("avoids NaN for invalid values", () => {
    expect(
      formatBundleDiscountLabel({
        discountType: "percentage",
        discountValue: { invalid: true },
        type: "quantity_break",
        tiers: [],
      }),
    ).toBe("No discount");
  });

  it("shows volume pricing when tiers exist without discount", () => {
    expect(
      formatBundleDiscountLabel({
        discountType: "percentage",
        discountValue: 0,
        type: "quantity_break",
        tiers: [{ discountType: "percentage", discountValue: 0 }],
      }),
    ).toBe("Volume pricing");
  });
});

describe("formatBundleTypeLabel", () => {
  it("replaces underscores with spaces", () => {
    expect(formatBundleTypeLabel("quantity_break")).toBe("Quantity breaks");
  });
});
