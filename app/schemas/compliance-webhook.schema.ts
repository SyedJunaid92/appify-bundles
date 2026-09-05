import { z } from "zod";

export const complianceCustomerSchema = z
  .object({
    id: z.union([z.number(), z.string()]).optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    admin_graphql_api_id: z.string().optional(),
  })
  .passthrough();

export const customersDataRequestSchema = z
  .object({
    shop_id: z.union([z.number(), z.string()]).optional(),
    shop_domain: z.string().optional(),
    orders_requested: z.array(z.union([z.number(), z.string()])).optional(),
    customer: complianceCustomerSchema.optional(),
    data_request: z.object({ id: z.union([z.number(), z.string()]).optional() }).optional(),
  })
  .passthrough();

export const customersRedactSchema = z
  .object({
    shop_id: z.union([z.number(), z.string()]).optional(),
    shop_domain: z.string().optional(),
    customer: complianceCustomerSchema.optional(),
    orders_to_redact: z.array(z.union([z.number(), z.string()])).optional(),
  })
  .passthrough();

export const shopRedactSchema = z
  .object({
    shop_id: z.union([z.number(), z.string()]).optional(),
    shop_domain: z.string().optional(),
  })
  .passthrough();

export function orderIdsFromCompliancePayload(payload: unknown): string[] {
  if (!payload || typeof payload !== "object") return [];
  const data = payload as {
    orders_to_redact?: unknown;
    orders_requested?: unknown;
  };
  const raw = data.orders_to_redact ?? data.orders_requested ?? [];
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.map((id) => String(id).trim()).filter(Boolean))];
}
