import { describe, expect, it } from "vitest";
import {
  allocateFixed,
  computeProductDiscounts,
  computeShippingDiscount,
  isGiftLineAllowed,
  matchTier,
} from "../app/engines/discount-engine";
import type { CompiledOffer } from "../app/engines/offer";

const offer = (patch: Partial<CompiledOffer>): CompiledOffer => ({
  id: "offer-1",
  type: "quantity_break",
  name: "Bundle savings",
  wo: false,
  xb2b: false,
  b2b: false,
  sc: "all",
  p: [],
  c: [],
  xp: [],
  xc: [],
  tiers: [{ q: 2, t: "p", v: 15 }],
  items: [],
  ...patch,
});

describe("matchTier", () => {
  it("picks the highest qualifying tier", () => {
    expect(matchTier(3, [{ q: 2, t: "p", v: 10 }, { q: 3, t: "p", v: 20 }])?.v).toBe(20);
    expect(matchTier(1, [{ q: 2, t: "p", v: 10 }])).toBeNull();
  });
});

describe("allocateFixed", () => {
  it("allocates pennies to the last line", () => {
    const rows = allocateFixed(
      [
        { id: "a", amount: 10 },
        { id: "b", amount: 10 },
      ],
      5,
    );
    expect(rows.reduce((sum, row) => sum + row.amount, 0)).toBe(5);
  });
});

describe("computeProductDiscounts", () => {
  it("applies quantity break percentage", () => {
    const result = computeProductDiscounts(
      { offers: [offer({})] },
      [
        {
          id: "line-1",
          quantity: 2,
          variantId: "gid://shopify/ProductVariant/1",
          productId: "gid://shopify/Product/1",
          unitAmount: 10,
          lineAmount: 20,
        },
      ],
    );
    expect(result).toEqual([
      expect.objectContaining({
        lineId: "line-1",
        kind: "percentage",
        value: 15,
      }),
    ]);
  });

  it("discounts cheapest BOGO units", () => {
    const result = computeProductDiscounts(
      {
        offers: [
          offer({
            type: "bogo",
            bogo: { b: 1, g: 1, t: "r", v: 100, max: 1 },
            tiers: [],
          }),
        ],
      },
      [
        {
          id: "line-1",
          quantity: 2,
          variantId: "gid://shopify/ProductVariant/1",
          productId: "gid://shopify/Product/1",
          unitAmount: 20,
          lineAmount: 40,
          bundleId: "offer-1",
        },
      ],
    );
    expect(result[0]?.kind).toBe("fixed");
    expect(result[0]?.value).toBe(20);
  });

  it("requires all fixed bundle items", () => {
    const compiled = offer({
      type: "fixed_bundle",
      items: [
        { v: "gid://shopify/ProductVariant/1", r: "required" },
        { v: "gid://shopify/ProductVariant/2", r: "required" },
      ],
      tiers: [{ q: 1, t: "p", v: 20 }],
    });
    const incomplete = computeProductDiscounts(
      { offers: [compiled] },
      [
        {
          id: "line-1",
          quantity: 1,
          variantId: "gid://shopify/ProductVariant/1",
          productId: "gid://shopify/Product/1",
          unitAmount: 10,
          lineAmount: 10,
          bundleId: "offer-1",
          instance: "i1",
        },
      ],
    );
    expect(incomplete).toEqual([]);
  });

  it("discounts FBT addons only in addons mode", () => {
    const result = computeProductDiscounts(
      {
        offers: [
          offer({
            type: "fbt_upsell",
            fbt: { mode: "addons", min: 2 },
            tiers: [{ q: 1, t: "p", v: 10 }],
          }),
        ],
      },
      [
        {
          id: "trigger",
          quantity: 1,
          variantId: "v1",
          productId: "p1",
          unitAmount: 40,
          lineAmount: 40,
          bundleId: "offer-1",
          instance: "i1",
          role: "trigger",
        },
        {
          id: "addon",
          quantity: 1,
          variantId: "v2",
          productId: "p2",
          unitAmount: 10,
          lineAmount: 10,
          bundleId: "offer-1",
          instance: "i1",
          role: "addon",
        },
      ],
    );
    expect(result).toHaveLength(1);
    expect(result[0]?.lineId).toBe("addon");
  });

  it("frees gifts only when threshold is met", () => {
    const giftOffer = offer({
      type: "gifts",
      gift: { by: "$", min: 50, ship: true },
      items: [{ v: "gid://shopify/ProductVariant/9", r: "gift" }],
      tiers: [],
    });
    const lines = [
      {
        id: "merch",
        quantity: 1,
        variantId: "v1",
        productId: "p1",
        unitAmount: 60,
        lineAmount: 60,
      },
      {
        id: "gift",
        quantity: 1,
        variantId: "gid://shopify/ProductVariant/9",
        productId: "p9",
        unitAmount: 12,
        lineAmount: 12,
        gift: true,
      },
    ];
    const result = computeProductDiscounts({ offers: [giftOffer] }, lines);
    expect(result[0]).toMatchObject({ lineId: "gift", value: 100 });
    expect(computeShippingDiscount({ offers: [giftOffer] }, lines)?.message).toBe(
      "Bundle savings",
    );
    expect(isGiftLineAllowed({ offers: [giftOffer] }, lines).ok).toBe(true);
    expect(
      isGiftLineAllowed(
        { offers: [giftOffer] },
        lines.map((line) =>
          line.id === "merch" ? { ...line, lineAmount: 10 } : line,
        ),
      ).ok,
    ).toBe(false);
  });

  it("applies per-item complete-bundle discounts without a parent variant", () => {
    const result = computeProductDiscounts(
      {
        offers: [
          offer({
            type: "quantity_break",
            tiers: [
              { q: 1, t: "full", v: 0, k: "product" },
              { q: 1, t: "p", v: 20, k: "complete" },
            ],
            items: [
              {
                v: "gid://shopify/ProductVariant/2",
                p: "gid://shopify/Product/2",
                r: "addon",
                t: "p",
                d: 20,
              },
            ],
          }),
        ],
      },
      [
        {
          id: "main",
          quantity: 1,
          variantId: "gid://shopify/ProductVariant/1",
          productId: "gid://shopify/Product/1",
          unitAmount: 600,
          lineAmount: 600,
          bundleId: "offer-1",
          instance: "i1",
          role: "trigger",
          kind: "complete",
        },
        {
          id: "wax",
          quantity: 1,
          variantId: "gid://shopify/ProductVariant/2",
          productId: "gid://shopify/Product/2",
          unitAmount: 25,
          lineAmount: 25,
          bundleId: "offer-1",
          instance: "i1",
          role: "addon",
          kind: "complete",
        },
      ],
    );
    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ lineId: "main", kind: "percentage", value: 20 }),
        expect.objectContaining({ lineId: "wax", kind: "percentage", value: 20 }),
      ]),
    );
  });
});
