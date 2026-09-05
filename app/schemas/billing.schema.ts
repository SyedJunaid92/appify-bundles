import { z } from "zod";
import { BILLING_PLAN_KEYS } from "../constants/billing";

export const billingPlanKeySchema = z.enum(BILLING_PLAN_KEYS);

export const selectPlanSchema = z.object({
  plan: billingPlanKeySchema,
});

export const billingHistoryEntrySchema = z.object({
  id: z.string(),
  shop: z.string(),
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
  orderCount: z.number().int().min(0),
  planKey: z.string(),
  baseAmount: z.number().min(0),
  usageAmount: z.number().min(0),
  totalAmount: z.number().min(0),
  status: z.enum(["pending", "charged", "failed"]),
  createdAt: z.coerce.date(),
});

export type SelectPlanInput = z.infer<typeof selectPlanSchema>;
export type BillingHistoryEntry = z.infer<typeof billingHistoryEntrySchema>;
