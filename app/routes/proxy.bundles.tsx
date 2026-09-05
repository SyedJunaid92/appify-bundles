import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import {
  filterBundlesForProduct,
  getStorefrontCatalog,
} from "../models/bundle.server";
import {
  assignExperimentVariant,
  experimentCookieName,
  parseExperimentCookie,
} from "../engines/ab-assign";
import { resolveBundleTypeId } from "../constants/bundle-types";
import { shopFromAppProxy } from "../utils/embedded-app";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.public.appProxy(request);
  const shop = shopFromAppProxy(request, session?.shop);

  if (!shop) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const productId = url.searchParams.get("product_id");
  const placement = url.searchParams.get("placement") === "cart" ? "cart" : "product";
  const collectionIds = (url.searchParams.get("collection_ids") || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .map((id) =>
      id.startsWith("gid://") ? id : `gid://shopify/Collection/${id}`,
    );

  if (!productId && placement === "product") {
    return Response.json({ error: "product_id required" }, { status: 400 });
  }

  const normalizedProductId = productId
    ? productId.startsWith("gid://")
      ? productId
      : `gid://shopify/Product/${productId}`
    : "";

  const catalog = await getStorefrontCatalog(shop);
  const matched = filterBundlesForProduct(
    catalog.bundles,
    normalizedProductId || "cart",
    { collectionIds, placement },
  );
  const widget = catalog.widget;
  const experiments = catalog.experiments;

  const cookieHeader = request.headers.get("cookie") || "";
  const cookies = Object.fromEntries(
    cookieHeader
      .split(";")
      .map((part) => part.trim().split("="))
      .filter((pair) => pair[0])
      .map(([key, ...rest]) => [key, decodeURIComponent(rest.join("="))]),
  );

  const challengerIds = new Set(experiments.map((exp) => exp.challengerBundleId));
  const setCookies: string[] = [];

  const visible = [];
  for (const bundle of matched) {
    if (challengerIds.has(bundle.id)) continue;

    const experiment = experiments.find((exp) => exp.controlBundleId === bundle.id);
    if (experiment) {
      const cookieKey = experimentCookieName(experiment.id);
      let variant = parseExperimentCookie(cookies[cookieKey]);
      if (!variant) {
        variant = assignExperimentVariant(
          experiment.trafficPercent,
          `${cookies.cart || cookies._shopify_y || "anon"}:${experiment.id}`,
        );
        setCookies.push(
          `${cookieKey}=${variant}; Path=/; Max-Age=${60 * 60 * 24 * 30}; SameSite=Lax`,
        );
      }
      if (variant === "challenger") {
        const challenger = catalog.bundles.find(
          (bundle) => bundle.id === experiment.challengerBundleId,
        );
        if (challenger) {
          visible.push({
            ...challenger,
            experimentId: experiment.id,
            experimentVariant: "challenger",
          });
          continue;
        }
      }
      visible.push({
        ...bundle,
        experimentId: experiment.id,
        experimentVariant: "control",
      });
      continue;
    }

    visible.push(bundle);
  }

  const payload = visible.map((bundle) => {
    const overrides = bundle.widgetOverrides as Record<string, unknown> | null;
    return {
      id: bundle.id,
      title: bundle.title,
      handle: bundle.handle,
      type: resolveBundleTypeId(bundle.type, bundle.layout),
      discountType: bundle.discountType,
      discountValue: Number(bundle.discountValue),
      layout: bundle.layout,
      blockTitle:
        (overrides?.blockTitle as string) || bundle.title || "BUNDLE & SAVE",
      config: overrides,
      experimentId: "experimentId" in bundle ? bundle.experimentId : undefined,
      experimentVariant:
        "experimentVariant" in bundle ? bundle.experimentVariant : undefined,
      parentVariantId: bundle.parentVariantId,
      items: bundle.items.map((item) => ({
        productId: item.productId,
        variantId: item.variantId,
        title: item.productTitle,
        variantTitle: item.variantTitle,
        quantity: item.quantity,
        role: item.role,
        selectedByDefault: item.selectedByDefault,
        optional: item.optional,
      })),
      tiers: bundle.tiers.map((tier) => ({
        minQuantity: tier.minQuantity,
        discountType: tier.discountType,
        discountValue: Number(tier.discountValue),
        label: tier.label,
      })),
    };
  });

  const headers = new Headers({
    "Cache-Control": "private, max-age=30, stale-while-revalidate=120",
    "Content-Type": "application/json",
  });
  for (const cookie of setCookies) {
    headers.append("Set-Cookie", cookie);
  }

  return Response.json({ bundles: payload, widget }, { headers });
};
