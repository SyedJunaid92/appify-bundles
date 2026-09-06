import "@shopify/shopify-app-react-router/adapters/node";
import "@shopify/shopify-api/adapters/web-api";
import {
  ApiVersion,
  AppDistribution,
  BillingInterval,
  BillingReplacementBehavior,
  shopifyApp,
} from "@shopify/shopify-app-react-router/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import {
  APPIFY_BUNDLES,
  APPIFY_BUNDLES_HANDLE,
  BILLING_TIERS,
  MONTHLY_CHARGE_CAP,
  TIER_1000,
  TIER_2000,
  TIER_4000,
  TIER_500,
  TIER_1500,
  TIER_ENTERPRISE,
  TIER_SCALE,
  TRIAL_DAYS,
  USAGE_TERMS,
} from "./constants/billing";
import prisma from "./db.server";
import { ensureCartTransform } from "./services/shopify-sync.server";

const REQUIRED_SCOPES = [
  "read_products",
  "write_products",
  "write_cart_transforms",
  "read_orders",
  "read_discounts",
  "write_discounts",
  "read_themes",
];

function appScopes() {
  const fromEnv = (process.env.SCOPES || "")
    .split(",")
    .map((scope) => scope.trim())
    .filter(Boolean);
  return [...new Set([...fromEnv, ...REQUIRED_SCOPES])];
}

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.April26,
  scopes: appScopes(),
  appUrl: process.env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma),
  distribution: AppDistribution.AppStore,
  billing: {
    [APPIFY_BUNDLES]: {
      trialDays: TRIAL_DAYS,
      replacementBehavior: BillingReplacementBehavior.ApplyImmediately,
      lineItems: [
        {
          amount: MONTHLY_CHARGE_CAP,
          currencyCode: "USD",
          interval: BillingInterval.Usage,
          terms: `${USAGE_TERMS}. Cap $${MONTHLY_CHARGE_CAP}.`,
        },
      ],
    },
    [APPIFY_BUNDLES_HANDLE]: {
      trialDays: TRIAL_DAYS,
      replacementBehavior: BillingReplacementBehavior.ApplyImmediately,
      lineItems: [
        {
          amount: MONTHLY_CHARGE_CAP,
          currencyCode: "USD",
          interval: BillingInterval.Usage,
          terms: `${USAGE_TERMS}. Cap $${MONTHLY_CHARGE_CAP}.`,
        },
      ],
    },
    [TIER_500]: {
      trialDays: TRIAL_DAYS,
      lineItems: [
        {
          amount: BILLING_TIERS[TIER_500].baseAmount,
          currencyCode: "USD",
          interval: BillingInterval.Every30Days,
        },
        {
          amount: MONTHLY_CHARGE_CAP - BILLING_TIERS[TIER_500].baseAmount,
          currencyCode: "USD",
          interval: BillingInterval.Usage,
          terms: `Auto-adjusts each month: $50 (0–500 orders), $125 (501–1,500), $175 + $0.01/order over 1,500. Cap $${MONTHLY_CHARGE_CAP}.`,
        },
      ],
    },
    [TIER_1500]: {
      trialDays: TRIAL_DAYS,
      lineItems: [
        {
          amount: BILLING_TIERS[TIER_1500].baseAmount,
          currencyCode: "USD",
          interval: BillingInterval.Every30Days,
        },
        {
          amount: MONTHLY_CHARGE_CAP - BILLING_TIERS[TIER_1500].baseAmount,
          currencyCode: "USD",
          interval: BillingInterval.Usage,
          terms: `Includes Growth ($125). Scale volume adds $175 − $125 plus $0.01/order over 1,500. Cap $${MONTHLY_CHARGE_CAP}.`,
        },
      ],
    },
    [TIER_SCALE]: {
      trialDays: TRIAL_DAYS,
      lineItems: [
        {
          amount: BILLING_TIERS[TIER_SCALE].baseAmount,
          currencyCode: "USD",
          interval: BillingInterval.Every30Days,
        },
        {
          amount: MONTHLY_CHARGE_CAP - BILLING_TIERS[TIER_SCALE].baseAmount,
          currencyCode: "USD",
          interval: BillingInterval.Usage,
          terms: `$0.01 per order over 1,500. Monthly cap $${MONTHLY_CHARGE_CAP}.`,
        },
      ],
    },
    [TIER_1000]: {
      trialDays: TRIAL_DAYS,
      lineItems: [
        {
          amount: 40,
          currencyCode: "USD",
          interval: BillingInterval.Every30Days,
        },
      ],
    },
    [TIER_2000]: {
      trialDays: TRIAL_DAYS,
      lineItems: [
        {
          amount: 75,
          currencyCode: "USD",
          interval: BillingInterval.Every30Days,
        },
      ],
    },
    [TIER_4000]: {
      trialDays: TRIAL_DAYS,
      lineItems: [
        {
          amount: 100,
          currencyCode: "USD",
          interval: BillingInterval.Every30Days,
        },
      ],
    },
    [TIER_ENTERPRISE]: {
      trialDays: TRIAL_DAYS,
      lineItems: [
        {
          amount: 130,
          currencyCode: "USD",
          interval: BillingInterval.Every30Days,
        },
        {
          amount: MONTHLY_CHARGE_CAP - 130,
          currencyCode: "USD",
          interval: BillingInterval.Usage,
          terms: "Legacy enterprise usage.",
        },
      ],
    },
  },
  hooks: {
    afterAuth: async ({ session, admin }) => {
      try {
        await shopify.registerWebhooks({ session });
      } catch (error) {
        console.error("Failed to register webhooks:", error);
      }
      try {
        const [{ upsertShopProfile }, db] = await Promise.all([
          import("./models/daily-stats.server"),
          import("./db.server"),
        ]);
        const stored = await db.default.session.findFirst({
          where: { shop: session.shop },
          select: { email: true, firstName: true, lastName: true },
        });
        const name = [stored?.firstName, stored?.lastName]
          .filter(Boolean)
          .join(" ");
        await upsertShopProfile(session.shop, {
          name: name || null,
          email: stored?.email,
        });
      } catch (error) {
        console.error("Failed to snapshot shop profile:", error);
      }
      try {
        await ensureCartTransform(admin);
      } catch (error) {
        console.error("Failed to activate cart transform:", error);
      }
      try {
        const { ensureAutomaticBundleDiscount } = await import(
          "./services/shopify-sync.server"
        );
        await ensureAutomaticBundleDiscount(admin);
      } catch (error) {
        console.error("Failed to activate bundle discount:", error);
      }
    },
  },
  future: {
    expiringOfflineAccessTokens: true,
  },
  ...(process.env.SHOP_CUSTOM_DOMAIN
    ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
    : {}),
});

export default shopify;
export const apiVersion = ApiVersion.April26;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;
