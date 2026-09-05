import type { AdminApiContext } from "@shopify/shopify-app-react-router/server";
import type { PreviewProduct } from "../types/bundle-editor";

export async function fetchPreviewProducts(
  admin: AdminApiContext,
  limit = 20,
): Promise<PreviewProduct[]> {
  const response = await admin.graphql(
    `#graphql
      query PreviewProducts($first: Int!) {
        shop {
          currencyCode
        }
        products(first: $first, sortKey: UPDATED_AT) {
          nodes {
            id
            title
            featuredImage {
              url
            }
            variants(first: 5) {
              nodes {
                id
                title
                price
                compareAtPrice
              }
            }
          }
        }
      }`,
    { variables: { first: limit } },
  );

  const json = await response.json();
  const currencyCode = json.data?.shop?.currencyCode ?? "USD";
  const nodes = json.data?.products?.nodes ?? [];

  return nodes.map(
    (product: {
      id: string;
      title: string;
      featuredImage?: { url: string };
      variants: {
        nodes: Array<{
          id: string;
          title: string;
          price: string;
          compareAtPrice?: string;
        }>;
      };
    }) => {
      const variant = product.variants.nodes[0];
      return {
        id: product.id,
        title: product.title,
        imageUrl: product.featuredImage?.url,
        variantId: variant?.id ?? product.id,
        variantTitle: variant?.title,
        price: Number(variant?.price ?? 0),
        compareAtPrice: variant?.compareAtPrice
          ? Number(variant.compareAtPrice)
          : undefined,
        currencyCode,
      };
    },
  );
}

export async function fetchProductsByIds(
  admin: AdminApiContext,
  ids: string[],
): Promise<PreviewProduct[]> {
  if (ids.length === 0) return [];

  const response = await admin.graphql(
    `#graphql
      query ProductsByIds($ids: [ID!]!) {
        shop {
          currencyCode
        }
        nodes(ids: $ids) {
          ... on Product {
            id
            title
            featuredImage {
              url
            }
            variants(first: 1) {
              nodes {
                id
                title
                price
                compareAtPrice
              }
            }
          }
        }
      }`,
    { variables: { ids } },
  );

  const json = await response.json();
  const currencyCode = json.data?.shop?.currencyCode ?? "USD";

  return (json.data?.nodes ?? [])
    .filter(Boolean)
    .map(
      (product: {
        id: string;
        title: string;
        featuredImage?: { url: string };
        variants: {
          nodes: Array<{
            id: string;
            title: string;
            price: string;
            compareAtPrice?: string;
          }>;
        };
      }) => {
        const variant = product.variants.nodes[0];
        return {
          id: product.id,
          title: product.title,
          imageUrl: product.featuredImage?.url,
          variantId: variant?.id ?? product.id,
          variantTitle: variant?.title,
          price: Number(variant?.price ?? 0),
          compareAtPrice: variant?.compareAtPrice
            ? Number(variant.compareAtPrice)
            : undefined,
          currencyCode,
        };
      },
    );
}
