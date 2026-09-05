import type { ActionFunctionArgs } from "react-router";
import { redirect } from "react-router";
import type { AdminApiContext } from "@shopify/shopify-app-react-router/server";
import type { BundleEditorState } from "../types/bundle-editor";
import {
  createBundle,
  ensureUniqueBundleHandle,
  getBundleById,
  updateBundle,
} from "../models/bundle.server";
import {
  syncBundleToShopify,
} from "./shopify-sync.server";
import {
  fetchProductsByIds,
  fetchPreviewProducts,
} from "./bundle-editor.server";
import {
  getBundleType,
  mapBundleTypeToDb,
} from "../constants/bundle-types";
import {
  barsToTiers,
  editorToWidgetOverrides,
} from "../utils/bundle-editor";
import { validateBundleEditorSubmit } from "../schemas/bundle-editor.schema";
import { validateOfferForPublish } from "../engines/publish-validation";
import { mergedOfferItems } from "../utils/complete-bundle";
import { MAX_ACTIVE_OFFERS } from "../engines/offer";
import { countActiveBundles } from "../models/bundle.server";
import {
  getBillingEnforcementState,
  isPublishingBlocked,
} from "../services/billing-enforcement.server";

function toSafeDiscount(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function saveBundleFromEditor(
  admin: AdminApiContext,
  shop: string,
  form: FormData,
) {
  const intent = String(form.get("intent") || "draft");
  const bundleTypeId = String(form.get("bundleTypeId") || "");
  const bundleId = String(form.get("bundleId") || "");
  const editorJson = String(form.get("editorState") || "{}");

  const bundleType = getBundleType(bundleTypeId);
  if (!bundleType) {
    return { error: "Invalid bundle type." };
  }

  let editorState: BundleEditorState;
  try {
    editorState = JSON.parse(editorJson);
  } catch {
    return { error: "Invalid editor data." };
  }

  if (intent === "publish") {
    const enforcement = await getBillingEnforcementState(shop);
    if (isPublishingBlocked(enforcement)) {
      return {
        error:
          "Bundles are paused because you reached your plan order limit. Upgrade your plan to publish again.",
      };
    }

    const validation = validateBundleEditorSubmit(editorState);
    if (!validation.success) {
      const message =
        validation.error.issues[0]?.message ?? "Invalid bundle configuration.";
      return { error: message };
    }
    const offerValidation = validateOfferForPublish(editorState, bundleTypeId);
    if (!offerValidation.success) {
      return { error: offerValidation.error };
    }
    const activeCount = await countActiveBundles(shop);
    const isNewPublish = !bundleId;
    if (isNewPublish && activeCount >= MAX_ACTIVE_OFFERS) {
      return {
        error: `You can have at most ${MAX_ACTIVE_OFFERS} live offers. Pause one to publish another.`,
      };
    }
  }

  const status = intent === "publish" ? "active" : "draft";
  const dbMapping = mapBundleTypeToDb(bundleType);
  const tiers = barsToTiers(editorState.bars);
  const widgetOverrides = JSON.parse(
    JSON.stringify(editorToWidgetOverrides(editorState)),
  );
  const baseHandle =
    editorState.internalName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "bundle";
  const handle = await ensureUniqueBundleHandle(
    shop,
    baseHandle,
    bundleId || undefined,
  );

  let productIds: string[] = [];
  if (editorState.productScope === "selected") {
    productIds = editorState.selectedProductIds;
  } else if (editorState.productScope === "collections") {
    productIds = editorState.selectedProductIds;
  } else {
    // "all products" — keep preview product for editor sync; storefront matches via productScope
    productIds = editorState.previewProductId
      ? [editorState.previewProductId]
      : [];
  }

  if (productIds.length === 0) {
    const previewProducts = await fetchPreviewProducts(admin, 1);
    if (previewProducts[0]) {
      productIds = [previewProducts[0].id];
      editorState.previewProductId = previewProducts[0].id;
    }
  }

  editorState.bundleTypeId = bundleType.id;

  const products = await fetchProductsByIds(admin, productIds);
  const offerItems = mergedOfferItems(editorState);
  const items =
    offerItems.length > 0
      ? offerItems
          .filter((item) => item.productId && item.variantId)
          .map((item, index) => ({
            productId: item.productId,
            variantId: item.variantId,
            productTitle: item.title || "Product",
            variantTitle: item.variantTitle,
            quantity: item.quantity || 1,
            sortOrder: index,
            role: item.role,
            selectedByDefault: item.selectedByDefault,
            optional: item.role === "optional" || item.role === "addon",
          }))
      : products.map((p, index) => ({
          productId: p.id,
          variantId: p.variantId,
          productTitle: p.title,
          variantTitle: p.variantTitle,
          quantity: 1,
          sortOrder: index,
          role: "pool",
        }));

  const maxDiscount = Math.max(
    0,
    ...editorState.bars.map((b) =>
      b.priceType === "percentage" ? toSafeDiscount(b.discountValue) : 0,
    ),
  );

  if (bundleId) {
    const existing = await getBundleById(shop, bundleId);
    if (!existing) {
      return { error: "Bundle not found." };
    }

    const updated = await updateBundle(shop, bundleId, {
      title: editorState.internalName,
      handle,
      type: dbMapping.type,
      layout: dbMapping.layout,
      discountType: "percentage",
      discountValue: maxDiscount,
      status,
      widgetOverrides,
      tiers,
      items,
    });

    if (status === "active") {
      await syncBundleToShopify(admin, updated);
    }

    return redirect(
      `/app/bundles/${bundleId}/edit?toast=${intent === "publish" ? "published" : "saved"}`,
    );
  }

  const bundle = await createBundle(shop, {
    title: editorState.internalName,
    handle,
    type: dbMapping.type,
    layout: dbMapping.layout,
    discountType: "percentage",
    discountValue: maxDiscount,
    widgetOverrides,
    items,
    tiers,
  });

  const updated = await updateBundle(shop, bundle.id, {
    status,
  });

  if (status === "active") {
    await syncBundleToShopify(admin, updated);
  }

  return redirect(
    `/app/bundles/${updated.id}/edit?toast=${intent === "publish" ? "published" : "created"}`,
  );
}

export async function handleBundleEditorAction(
  args: ActionFunctionArgs & {
    admin: AdminApiContext;
    session: { shop: string };
  },
) {
  const form = await args.request.formData();
  if (!form.get("bundleId") && args.params.id) {
    form.set("bundleId", args.params.id);
  }
  return saveBundleFromEditor(args.admin, args.session.shop, form);
}
