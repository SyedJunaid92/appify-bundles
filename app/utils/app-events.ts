import { ORDER_PROCESSED_EVENT_HANDLE } from "../constants/billing";

export function isShopifyAppPricingEnabled(
  value: string | undefined = process.env.SHOPIFY_APP_PRICING_ENABLED,
): boolean {
  return value === "true";
}

export function numericShopId(shopId: string): string {
  const match = shopId.match(/(\d+)\s*$/);
  return match?.[1] ?? shopId.replace(/\D/g, "");
}

export function orderProcessedIdempotencyKey(
  shopId: string,
  orderId: string,
): string {
  return `op_${numericShopId(shopId)}_${orderId}`.slice(0, 64);
}

export function buildOrderProcessedEvent(options: {
  shopId: string;
  orderId: string;
  timestamp?: string;
  value?: number;
}) {
  return {
    shop_id: options.shopId,
    event_handle: ORDER_PROCESSED_EVENT_HANDLE,
    timestamp: options.timestamp ?? new Date().toISOString(),
    idempotency_key: orderProcessedIdempotencyKey(
      options.shopId,
      options.orderId,
    ),
    attributes: {
      value: options.value ?? 1,
    },
  };
}
