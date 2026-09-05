import type { AdminApiContext } from "@shopify/shopify-app-react-router/server";
import type { BundleWithRelations } from "../models/bundle.server";
import prisma from "../db.server";
import { compileOfferFromEditor, compileOffersPayload, collectionIdsFromOffers } from "../engines/offer-compiler";
import { isScheduleActive } from "../engines/targeting";
import { editorStateFromBundle } from "../constants/bundle-editor-defaults";
import type { BundleEditorState } from "../types/bundle-editor";

const METAFIELD_NAMESPACE = "$app:bundles";
const AUTOMATIC_DISCOUNT_TITLE = "Appify Bundle Discounts";
const DISCOUNT_FUNCTION_HANDLE = "bundle-discount";

type DiscountNode = {
  id: string;
  discount?: {
    discountClasses?: string[];
    title?: string;
    status?: string;
  } | null;
};

export async function syncBundleToShopify(
  admin: AdminApiContext,
  bundle: BundleWithRelations,
) {
  if (bundle.items.length === 0) {
    return { synced: false, reason: "missing_items" };
  }

  const bundleConfig = JSON.stringify({
    bundleId: bundle.id,
    handle: bundle.handle,
    type: bundle.type,
    discountType: bundle.discountType,
    discountValue: Number(bundle.discountValue),
    layout: bundle.layout,
    tiers: bundle.tiers.map((tier) => ({
      minQuantity: tier.minQuantity,
      discountType: tier.discountType,
      discountValue: Number(tier.discountValue),
      label: tier.label,
    })),
  });

  for (const item of bundle.items) {
    await admin.graphql(
      `#graphql
        mutation SetBundleVariantConfig($metafields: [MetafieldsSetInput!]!) {
          metafieldsSet(metafields: $metafields) {
            userErrors { message }
          }
        }`,
      {
        variables: {
          metafields: [
            {
              ownerId: item.variantId,
              namespace: METAFIELD_NAMESPACE,
              key: "bundle_config",
              type: "json",
              value: bundleConfig,
            },
          ],
        },
      },
    );
  }

  await ensureAutomaticBundleDiscount(admin);
  await syncActiveOffersToDiscount(admin, bundle.shop);

  return { synced: true };
}

export async function syncActiveOffersToDiscount(
  admin: AdminApiContext,
  shop: string,
) {
  const bundles = await prisma.bundle.findMany({
    where: { shop, status: "active" },
    include: { items: true, tiers: true },
  });

  const runningExperiments = await prisma.bundleExperiment.findMany({
    where: { shop, status: "running" },
    select: { challengerBundleId: true },
  });
  const challengerIds = new Set(
    runningExperiments.map((experiment) => experiment.challengerBundleId),
  );

  const offers = bundles
    .filter((bundle) => {
      const editor = editorStateFromBundle(bundle);
      return isScheduleActive(editor.settings);
    })
    .map((bundle) => {
      const editor = editorStateFromBundle(bundle) as BundleEditorState;
      if (challengerIds.has(bundle.id)) {
        editor.settings = { ...editor.settings, discountViaWidgetOnly: true };
      }
      return compileOfferFromEditor(bundle.id, editor, bundle.type);
    });

  const payload = compileOffersPayload(offers);
  const collectionIds = collectionIdsFromOffers(payload.offers);
  const discountId = await ensureAutomaticBundleDiscount(admin);

  if (!discountId) return { synced: false };

  await admin.graphql(
    `#graphql
      mutation SetAppifyDiscountOffers($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          userErrors { message }
        }
      }`,
    {
      variables: {
        metafields: [
          {
            ownerId: discountId,
            namespace: "$app",
            key: "offers",
            type: "json",
            value: JSON.stringify(payload),
          },
          {
            ownerId: discountId,
            namespace: "$app",
            key: "function-inputs",
            type: "json",
            value: JSON.stringify({ collectionIds }),
          },
        ],
      },
    },
  );

  return { synced: true, offerCount: payload.offers.length };
}

function buildDiscountInput() {
  return {
    title: AUTOMATIC_DISCOUNT_TITLE,
    functionHandle: DISCOUNT_FUNCTION_HANDLE,
    discountClasses: ["PRODUCT", "SHIPPING"],
    startsAt: new Date().toISOString(),
    combinesWith: {
      orderDiscounts: true,
      productDiscounts: true,
      shippingDiscounts: true,
    },
  };
}

export async function ensureAutomaticBundleDiscount(admin: AdminApiContext) {
  const existingResponse = await admin.graphql(
    `#graphql
      query AppifyExistingBundleDiscount {
        discountNodes(first: 5, query: "title:'${AUTOMATIC_DISCOUNT_TITLE}'") {
          nodes {
            id
            discount {
              ... on DiscountAutomaticApp {
                title
                status
                discountClasses
              }
            }
          }
        }
      }`,
  );
  const existingJson = await existingResponse.json();
  const existingNodes: DiscountNode[] =
    existingJson.data?.discountNodes?.nodes ?? [];

  const existing = existingNodes[0];
  if (existing?.id) {
    const classes = existing.discount?.discountClasses ?? [];
    const hasProductClass = classes.includes("PRODUCT");
    const hasShippingClass = classes.includes("SHIPPING");
    if (hasProductClass && hasShippingClass) {
      return existing.id;
    }

    const updateResponse = await admin.graphql(
      `#graphql
        mutation UpdateAppifyBundleDiscount(
          $id: ID!
          $discount: DiscountAutomaticAppInput!
        ) {
          discountAutomaticAppUpdate(id: $id, automaticAppDiscount: $discount) {
            automaticAppDiscount { discountId }
            userErrors { field message }
          }
        }`,
      {
        variables: {
          id: existing.id,
          discount: {
            discountClasses: ["PRODUCT", "SHIPPING"],
            combinesWith: {
              orderDiscounts: true,
              productDiscounts: true,
              shippingDiscounts: true,
            },
          },
        },
      },
    );
    const updateJson = await updateResponse.json();
    const updateErrors =
      updateJson.data?.discountAutomaticAppUpdate?.userErrors ?? [];
    if (updateErrors.length > 0) {
      console.warn(
        "[bundle-discount] Failed to update discount classes:",
        updateErrors,
      );
    }
    return existing.id;
  }

  const response = await admin.graphql(
    `#graphql
      mutation CreateAppifyBundleDiscount($discount: DiscountAutomaticAppInput!) {
        discountAutomaticAppCreate(automaticAppDiscount: $discount) {
          automaticAppDiscount { discountId }
          userErrors { field message }
        }
      }`,
    {
      variables: {
        discount: buildDiscountInput(),
      },
    },
  );

  const json = await response.json();
  const errors = json.data?.discountAutomaticAppCreate?.userErrors ?? [];
  if (errors.length > 0) {
    // Fallback for API versions that still require functionId
    const functionsResponse = await admin.graphql(
      `#graphql
        query AppifyBundleDiscountFunction {
          shopifyFunctions(first: 25) {
            nodes { id title apiType }
          }
        }`,
    );
    const functionsJson = await functionsResponse.json();
    const functions = functionsJson.data?.shopifyFunctions?.nodes ?? [];
    const discountFunction =
      functions.find(
        (fn: { title?: string; apiType?: string }) =>
          fn.title === "bundle-discount" ||
          fn.title?.toLowerCase().includes("bundle-discount"),
      ) ??
      functions.find((fn: { apiType?: string }) => fn.apiType === "discount");

    if (!discountFunction?.id) {
      throw new Error(
        errors.map((e: { message: string }) => e.message).join(", "),
      );
    }

    const fallback = await admin.graphql(
      `#graphql
        mutation CreateAppifyBundleDiscountFallback(
          $discount: DiscountAutomaticAppInput!
        ) {
          discountAutomaticAppCreate(automaticAppDiscount: $discount) {
            automaticAppDiscount { discountId }
            userErrors { field message }
          }
        }`,
      {
        variables: {
          discount: {
            title: AUTOMATIC_DISCOUNT_TITLE,
            functionId: discountFunction.id,
            discountClasses: ["PRODUCT", "SHIPPING"],
            startsAt: new Date().toISOString(),
            combinesWith: {
              orderDiscounts: true,
              productDiscounts: true,
              shippingDiscounts: true,
            },
          },
        },
      },
    );
    const fallbackJson = await fallback.json();
    const fallbackErrors =
      fallbackJson.data?.discountAutomaticAppCreate?.userErrors ?? [];
    if (fallbackErrors.length > 0) {
      throw new Error(
        fallbackErrors.map((e: { message: string }) => e.message).join(", "),
      );
    }
    return (
      fallbackJson.data?.discountAutomaticAppCreate?.automaticAppDiscount
        ?.discountId ?? null
    );
  }

  return json.data?.discountAutomaticAppCreate?.automaticAppDiscount?.discountId ?? null;
}

export async function ensureCartTransform(admin: AdminApiContext) {
  const existing = await admin.graphql(
    `#graphql
      query CartTransforms {
        cartTransforms(first: 1) {
          nodes { id functionId }
        }
      }`,
  );
  const existingJson = await existing.json();
  if (existingJson.data?.cartTransforms?.nodes?.length > 0) {
    return { created: false };
  }

  const response = await admin.graphql(
    `#graphql
      mutation CreateCartTransform($functionHandle: String!) {
        cartTransformCreate(functionHandle: $functionHandle, blockOnFailure: false) {
          cartTransform { id }
          userErrors { field message }
        }
      }`,
    {
      variables: { functionHandle: "bundle-cart-transform" },
    },
  );

  const json = await response.json();
  const errors = json.data?.cartTransformCreate?.userErrors ?? [];
  if (errors.length > 0) {
    throw new Error(errors.map((e: { message: string }) => e.message).join(", "));
  }

  return { created: true };
}

/** @deprecated Bundles no longer create standalone Shopify products. */
export async function createBundleParentProduct(
  admin: AdminApiContext,
  title: string,
) {
  void admin;
  void title;
  throw new Error(
    "Bundle parent products are deprecated. Discounts apply to existing product variants.",
  );
}
