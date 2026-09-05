import type { Prisma } from "@prisma/client";
import prisma from "../db.server";
import { DEFAULT_WIDGET_COLORS } from "../constants/billing";

export type BundleWithRelations = Prisma.BundleGetPayload<{
  include: { items: true; tiers: true };
}>;

export async function getOrCreateShopSettings(shop: string) {
  return prisma.shopSettings.upsert({
    where: { shop },
    create: {
      shop,
      widget: DEFAULT_WIDGET_COLORS,
    },
    update: {},
    select: { id: true, shop: true, widget: true },
  });
}

export async function listBundles(shop: string, status?: string) {
  return prisma.bundle.findMany({
    where: {
      shop,
      ...(status ? { status } : {}),
    },
    include: {
      items: { orderBy: { sortOrder: "asc" }, take: 3 },
      tiers: { orderBy: { minQuantity: "asc" }, take: 3 },
      _count: { select: { items: true, tiers: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getBundleById(shop: string, id: string) {
  return prisma.bundle.findFirst({
    where: { id, shop },
    include: {
      items: { orderBy: { sortOrder: "asc" } },
      tiers: { orderBy: { minQuantity: "asc" } },
    },
  });
}

export async function ensureUniqueBundleHandle(
  shop: string,
  baseHandle: string,
  excludeId?: string,
): Promise<string> {
  let handle = baseHandle;
  let suffix = 2;

  for (;;) {
    const existing = await prisma.bundle.findFirst({
      where: {
        shop,
        handle,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { id: true },
    });

    if (!existing) {
      return handle;
    }

    handle = `${baseHandle}-${suffix}`;
    suffix += 1;
  }
}

function productIdMatches(stored: string | null | undefined, target: string) {
  if (!stored) return false;
  if (stored === target) return true;
  const strip = (value: string) =>
    value.replace(/^gid:\/\/shopify\/Product\//, "");
  return strip(stored) === strip(target);
}

function isProductExcluded(
  exceptions: unknown,
  productId: string,
): boolean {
  if (!Array.isArray(exceptions)) return false;
  return exceptions.some((id) => productIdMatches(String(id), productId));
}

export async function getActiveBundlesForProduct(
  shop: string,
  productId: string,
  options: {
    collectionIds?: string[];
    placement?: "product" | "cart";
    now?: Date;
  } = {},
) {
  const bundles = await prisma.bundle.findMany({
    where: {
      shop,
      status: "active",
    },
    include: {
      items: { orderBy: { sortOrder: "asc" } },
      tiers: { orderBy: { minQuantity: "asc" } },
    },
  });

  const { isScheduleActive, anyIdMatch } = await import("../engines/targeting");
  const now = options.now ?? new Date();
  const collectionIds = options.collectionIds ?? [];
  const placement = options.placement ?? "product";

  return bundles.filter((bundle) => {
    const overrides = (bundle.widgetOverrides ?? {}) as {
      productScope?: string;
      selectedProductIds?: string[];
      selectedCollectionIds?: string[];
      exceptionProductIds?: string[];
      exceptionCollectionIds?: string[];
      placement?: string;
      settings?: {
        startDate?: string;
        startTime?: string;
        hasEndDate?: boolean;
        endDate?: string;
        endTime?: string;
      };
    };
    const scope = overrides.productScope ?? "selected";
    const offerPlacement = overrides.placement ?? "product";

    if (offerPlacement !== "both" && offerPlacement !== placement) {
      if (!(offerPlacement === "product" && placement === "product")) {
        return false;
      }
    }

    if (!isScheduleActive(overrides.settings, now)) {
      return false;
    }

    if (isProductExcluded(overrides.exceptionProductIds, productId)) {
      return false;
    }
    if (
      Array.isArray(overrides.exceptionCollectionIds) &&
      collectionIds.some((id) => anyIdMatch(overrides.exceptionCollectionIds, id))
    ) {
      return false;
    }

    if (scope === "all") {
      return true;
    }

    if (scope === "collections") {
      return collectionIds.some((id) =>
        anyIdMatch(overrides.selectedCollectionIds, id),
      );
    }

    if (productIdMatches(bundle.parentProductId, productId)) {
      return true;
    }

    if (bundle.items.some((item) => productIdMatches(item.productId, productId))) {
      return true;
    }

    if (
      Array.isArray(overrides.selectedProductIds) &&
      overrides.selectedProductIds.some((id) => productIdMatches(id, productId))
    ) {
      return true;
    }

    return false;
  });
}

export async function getShopWidgetSettings(shop: string) {
  const settings = await prisma.shopSettings.findUnique({
    where: { shop },
    select: { widget: true },
  });
  return (settings?.widget as Record<string, string>) ?? DEFAULT_WIDGET_COLORS;
}

export async function updateShopWidgetSettings(
  shop: string,
  widget: Record<string, string>,
) {
  const shopSettings = await getOrCreateShopSettings(shop);
  return prisma.shopSettings.update({
    where: { id: shopSettings.id },
    data: { widget },
    select: { widget: true },
  });
}

export async function createBundle(
  shop: string,
  data: {
    title: string;
    handle: string;
    type?: string;
    discountType?: string;
    discountValue?: number;
    layout?: string;
    widgetOverrides?: Prisma.InputJsonValue;
    items?: Array<{
      productId: string;
      variantId: string;
      productTitle: string;
      variantTitle?: string;
      quantity?: number;
      sortOrder?: number;
      role?: string;
      selectedByDefault?: boolean;
      optional?: boolean;
    }>;
    tiers?: Array<{
      minQuantity: number;
      discountType?: string;
      discountValue?: number;
      label?: string;
      sortOrder?: number;
    }>;
  },
) {
  const shopSettings = await getOrCreateShopSettings(shop);

  return prisma.bundle.create({
    data: {
      shop,
      shopSettingsId: shopSettings.id,
      title: data.title,
      handle: data.handle,
      type: data.type ?? "fixed",
      discountType: data.discountType ?? "percentage",
      discountValue: data.discountValue ?? 0,
      layout: data.layout ?? "cards",
      widgetOverrides: data.widgetOverrides ?? undefined,
      items: data.items?.length
        ? {
            create: data.items.map((item, index) => ({
              productId: item.productId,
              variantId: item.variantId,
              productTitle: item.productTitle,
              variantTitle: item.variantTitle,
              quantity: item.quantity ?? 1,
              sortOrder: item.sortOrder ?? index,
              role: item.role ?? "pool",
              selectedByDefault: item.selectedByDefault ?? false,
              optional: item.optional ?? item.role === "optional",
            })),
          }
        : undefined,
      tiers: data.tiers?.length
        ? {
            create: data.tiers.map((tier, index) => ({
              minQuantity: tier.minQuantity,
              discountType: tier.discountType ?? "percentage",
              discountValue: tier.discountValue ?? 0,
              label: tier.label,
              sortOrder: tier.sortOrder ?? index,
            })),
          }
        : undefined,
    },
    include: { items: true, tiers: true },
  });
}

export async function updateBundle(
  shop: string,
  id: string,
  data: Prisma.BundleUpdateInput & {
    items?: Array<{
      productId: string;
      variantId: string;
      productTitle: string;
      variantTitle?: string;
      quantity?: number;
      sortOrder?: number;
      role?: string;
      selectedByDefault?: boolean;
      optional?: boolean;
    }>;
    tiers?: Array<{
      minQuantity: number;
      discountType?: string;
      discountValue?: number;
      label?: string;
      sortOrder?: number;
    }>;
  },
) {
  const { items, tiers, ...bundleData } = data;

  return prisma.$transaction(async (tx) => {
    if (items) {
      await tx.bundleItem.deleteMany({ where: { bundleId: id } });
      await tx.bundleItem.createMany({
        data: items.map((item, index) => ({
          bundleId: id,
          productId: item.productId,
          variantId: item.variantId,
          productTitle: item.productTitle,
          variantTitle: item.variantTitle,
          quantity: item.quantity ?? 1,
          sortOrder: item.sortOrder ?? index,
          role: item.role ?? "pool",
          selectedByDefault: item.selectedByDefault ?? false,
          optional: item.optional ?? item.role === "optional",
        })),
      });
    }

    if (tiers) {
      await tx.bundleTier.deleteMany({ where: { bundleId: id } });
      await tx.bundleTier.createMany({
        data: tiers.map((tier, index) => ({
          bundleId: id,
          minQuantity: tier.minQuantity,
          discountType: tier.discountType ?? "percentage",
          discountValue: tier.discountValue ?? 0,
          label: tier.label,
          sortOrder: tier.sortOrder ?? index,
        })),
      });
    }

    return tx.bundle.update({
      where: { id },
      data: bundleData,
      include: { items: true, tiers: true },
    });
  });
}

export async function deleteBundle(shop: string, id: string) {
  const bundle = await prisma.bundle.findFirst({ where: { id, shop } });
  if (!bundle) return null;
  await prisma.bundle.delete({ where: { id } });
  return bundle;
}

export async function countActiveBundles(shop: string) {
  return prisma.bundle.count({ where: { shop, status: "active" } });
}

export async function pauseAllActiveBundles(shop: string) {
  const result = await prisma.bundle.updateMany({
    where: { shop, status: "active" },
    data: { status: "paused" },
  });
  return result.count;
}

export async function resumePausedBundles(shop: string) {
  const result = await prisma.bundle.updateMany({
    where: { shop, status: "paused" },
    data: { status: "active" },
  });
  return result.count;
}

export async function countPausedBundles(shop: string) {
  return prisma.bundle.count({ where: { shop, status: "paused" } });
}

export async function updateBundleStatus(
  shop: string,
  id: string,
  status: string,
) {
  const bundle = await prisma.bundle.findFirst({ where: { id, shop } });
  if (!bundle) return null;

  return prisma.bundle.update({
    where: { id },
    data: { status },
  });
}

export async function getDashboardData(shop: string) {
  const [recentBundles, totalBundles, activeCount, shopSettings] =
    await Promise.all([
      prisma.bundle.findMany({
        where: { shop },
        select: {
          id: true,
          title: true,
          type: true,
          status: true,
          _count: { select: { items: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: 5,
      }),
      prisma.bundle.count({ where: { shop } }),
      prisma.bundle.count({ where: { shop, status: "active" } }),
      prisma.shopSettings.findUnique({
        where: { shop },
        select: { widget: true },
      }),
    ]);

  const widget = shopSettings?.widget as Record<string, unknown> | null;

  return {
    bundles: recentBundles,
    totalBundles,
    activeCount,
    dismissed: Boolean(widget?.setupGuideDismissed),
  };
}

export async function isSetupGuideDismissed(shop: string) {
  const settings = await prisma.shopSettings.findUnique({
    where: { shop },
    select: { widget: true },
  });
  const widget = settings?.widget as Record<string, unknown> | null;
  return Boolean(widget?.setupGuideDismissed);
}

export async function dismissSetupGuide(shop: string) {
  const shopSettings = await getOrCreateShopSettings(shop);
  const widget =
    (shopSettings.widget as Record<string, unknown>) ?? DEFAULT_WIDGET_COLORS;
  return prisma.shopSettings.update({
    where: { id: shopSettings.id },
    data: { widget: { ...widget, setupGuideDismissed: true } },
  });
}
