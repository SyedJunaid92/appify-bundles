import "@shopify/shopify-api/adapters/web-api";
import { authenticate } from "../shopify.server";

export async function authenticateWebhook(request: Request) {
  if (request.method !== "POST") {
    throw new Response(undefined, {
      status: 405,
      statusText: "Method not allowed",
    });
  }

  try {
    return await authenticate.webhook(request);
  } catch (error) {
    if (error instanceof Response) {
      console.error("[webhook-auth] rejected", {
        status: error.status,
        topic: request.headers.get("x-shopify-topic"),
        shop: request.headers.get("x-shopify-shop-domain"),
        hasHmac: Boolean(request.headers.get("x-shopify-hmac-sha256")),
        hasShop: Boolean(request.headers.get("x-shopify-shop-domain")),
        hasTopic: Boolean(request.headers.get("x-shopify-topic")),
      });
    }
    throw error;
  }
}
