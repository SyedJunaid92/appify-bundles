import { describe, expect, it } from "vitest";
import {
  resolveBundleTypeId,
  EDITOR_ENABLED_TYPES,
  BUNDLE_TYPES,
  getBundleType,
  canonicalizeBundleTypeId,
} from "../app/constants/bundle-types";

describe("resolveBundleTypeId", () => {
  it("maps quantity_break db type", () => {
    expect(resolveBundleTypeId("quantity_break")).toBe("quantity_break");
  });

  it("maps legacy bxgy db type to bogo", () => {
    expect(resolveBundleTypeId("bxgy")).toBe("bogo");
  });

  it("maps mix_match db type", () => {
    expect(resolveBundleTypeId("mix_match")).toBe("mix_match");
  });

  it("falls back via layout when type unknown", () => {
    expect(resolveBundleTypeId("unknown", "gifts")).toBe("gifts");
  });

  it("defaults to quantity_break", () => {
    expect(resolveBundleTypeId("unknown")).toBe("quantity_break");
  });
});

describe("legacy aliases", () => {
  it("canonicalizes old editor ids", () => {
    expect(canonicalizeBundleTypeId("quantity_break_same")).toBe("quantity_break");
    expect(canonicalizeBundleTypeId("complete_bundle")).toBe("fixed_bundle");
    expect(canonicalizeBundleTypeId("progressive_gifts")).toBe("gifts");
    expect(getBundleType("bxgy")?.id).toBe("bogo");
  });
});

describe("EDITOR_ENABLED_TYPES", () => {
  it("includes all six engines", () => {
    expect(EDITOR_ENABLED_TYPES).toEqual([
      "quantity_break",
      "bogo",
      "mix_match",
      "fixed_bundle",
      "fbt_upsell",
      "gifts",
    ]);
    expect(EDITOR_ENABLED_TYPES.length).toBe(BUNDLE_TYPES.length);
  });
});
