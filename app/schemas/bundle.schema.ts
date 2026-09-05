import { z } from "zod";

export const bundleStatusSchema = z.enum(["draft", "active", "paused", "archived"]);

export const bundleItemSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().min(1),
  productTitle: z.string().min(1),
  variantTitle: z.string().optional(),
  quantity: z.number().int().min(1).default(1),
  sortOrder: z.number().int().min(0).default(0),
  optional: z.boolean().default(false),
});

export const bundleTierSchema = z.object({
  minQuantity: z.number().int().min(1),
  discountType: z.enum(["percentage", "fixed"]).default("percentage"),
  discountValue: z.number().min(0),
  label: z.string().optional(),
  sortOrder: z.number().int().min(0).default(0),
});

export const createBundleSchema = z.object({
  title: z.string().min(1).max(255),
  handle: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[a-z0-9-]+$/, "Handle must be lowercase alphanumeric with hyphens"),
  type: z.string().default("fixed"),
  status: bundleStatusSchema.default("draft"),
  discountType: z.enum(["percentage", "fixed"]).default("percentage"),
  discountValue: z.number().min(0).default(0),
  layout: z.string().default("cards"),
  items: z.array(bundleItemSchema).optional(),
  tiers: z.array(bundleTierSchema).optional(),
});

export const widgetSettingsSchema = z.object({
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  textColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  borderColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  badgeColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  badgeTextColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  selectedBorderColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  borderRadius: z.string().regex(/^\d+$/),
  fontSize: z.string().regex(/^\d+$/),
});

export type CreateBundleInput = z.infer<typeof createBundleSchema>;
export type WidgetSettingsInput = z.infer<typeof widgetSettingsSchema>;
