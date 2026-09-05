import { describe, expect, it } from "vitest";
import {
  validateBundleEditorSubmit,
  bundleEditorSubmitSchema,
} from "../app/schemas/bundle-editor.schema";

const validBar = {
  id: "bar-1",
  quantity: 1,
  priceType: "full" as const,
  discountValue: 0,
  title: "Single",
  subtitle: "",
  badgeText: "",
  label: "",
  badgeStyle: "simple" as const,
  isPopular: false,
  selectedByDefault: true,
  showQuantitySelector: false,
  applySellingPlan: false,
  soldOut: false,
  showProductCard: false,
};

const validEditor = {
  internalName: "Test Bundle",
  blockTitle: "BUNDLE & SAVE",
  discountName: "",
  productScope: "all" as const,
  selectedProductIds: [],
  selectedCollectionIds: [],
  exceptionProductIds: [],
  bars: [validBar],
  previewCountry: "Canada",
};

describe("bundleEditorSubmitSchema", () => {
  it("accepts valid editor state", () => {
    const result = bundleEditorSubmitSchema.safeParse(validEditor);
    expect(result.success).toBe(true);
  });

  it("rejects empty internal name", () => {
    const result = validateBundleEditorSubmit({
      ...validEditor,
      internalName: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty block title", () => {
    const result = validateBundleEditorSubmit({
      ...validEditor,
      blockTitle: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty bars array", () => {
    const result = validateBundleEditorSubmit({
      ...validEditor,
      bars: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects bar with zero quantity", () => {
    const result = validateBundleEditorSubmit({
      ...validEditor,
      bars: [{ ...validBar, quantity: 0 }],
    });
    expect(result.success).toBe(false);
  });
});
