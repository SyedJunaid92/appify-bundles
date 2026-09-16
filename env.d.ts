/// <reference types="vite/client" />
/// <reference types="@react-router/node" />

declare namespace NodeJS {
  interface ProcessEnv {
    UPSTASH_REDIS_REST_URL?: string;
    UPSTASH_REDIS_REST_TOKEN?: string;
    CRON_SECRET?: string;
    VERCEL?: string;
    SHOPIFY_PARTNER_ORG_ID?: string;
    SHOPIFY_PARTNER_API_ACCESS_TOKEN?: string;
    SHOPIFY_APP_GID?: string;
    SHOPIFY_APP_HANDLE?: string;
  }
}
