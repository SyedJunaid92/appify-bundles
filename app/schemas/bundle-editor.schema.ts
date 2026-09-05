import { z } from "zod";

export const bundleBarSchema = z.object({
  id: z.string().min(1),
  quantity: z.number().int().min(1),
  priceType: z.enum(["full", "percentage", "fixed", "flat", "free"]),
  discountValue: z.number().min(0),
  title: z.string().min(1, "Bar title is required"),
  subtitle: z.string(),
  badgeText: z.string(),
  label: z.string(),
  badgeStyle: z.enum(["simple", "ribbon"]),
  isPopular: z.boolean(),
  selectedByDefault: z.boolean(),
  showQuantitySelector: z.boolean(),
  applySellingPlan: z.boolean(),
  soldOut: z.boolean(),
  showProductCard: z.boolean(),
}).passthrough();

export const bundleEditorSubmitSchema = z.object({
  internalName: z
    .string()
    .min(1, "Internal name is required")
    .max(255),
  blockTitle: z
    .string()
    .min(1, "Block title is required")
    .max(255),
  discountName: z.string().max(255),
  productScope: z.enum(["all", "selected", "collections"]),
  selectedProductIds: z.array(z.string()),
  selectedCollectionIds: z.array(z.string()).optional().default([]),
  exceptionProductIds: z.array(z.string()),
  exceptionCollectionIds: z.array(z.string()).optional().default([]),
  offerItems: z.array(z.record(z.unknown())).optional().default([]),
  bundleTypeId: z.string().optional(),
  bars: z
    .array(bundleBarSchema)
    .min(1, "At least one pricing bar is required"),
  previewProductId: z.string().optional(),
  previewCountry: z.string(),
  settings: z.record(z.unknown()).optional(),
  style: z.record(z.unknown()).optional(),
  features: z.record(z.unknown()).optional(),
}).passthrough();

export type BundleEditorSubmitInput = z.infer<typeof bundleEditorSubmitSchema>;

export function validateBundleEditorSubmit(data: unknown) {
  return bundleEditorSubmitSchema.safeParse(data);
}
