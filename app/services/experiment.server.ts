import {
  createBundle,
  ensureUniqueBundleHandle,
  getBundleById,
  updateBundleStatus,
} from "../models/bundle.server";
import {
  completeExperiment,
  countRunningExperiments,
  createExperiment,
  startExperiment,
} from "../models/experiment.server";
import { resolveBundleTypeId } from "../constants/bundle-types";

const MAX_RUNNING = 3;

export async function createAbTestFromBundle(shop: string, controlId: string) {
  const control = await getBundleById(shop, controlId);
  if (!control || control.status !== "active") {
    return { error: "Start an A/B test from an active bundle." };
  }

  const running = await countRunningExperiments(shop);
  if (running >= MAX_RUNNING) {
    return { error: "You already have the maximum number of running tests." };
  }

  const typeId = resolveBundleTypeId(control.type, control.layout);
  const handle = await ensureUniqueBundleHandle(shop, `${control.handle}-b`);
  const challenger = await createBundle(shop, {
    title: `${control.title} (B)`,
    handle,
    type: typeId,
    layout: control.layout,
    discountType: control.discountType,
    discountValue: Number(control.discountValue),
    widgetOverrides: control.widgetOverrides as never,
    items: control.items.map((item, index) => ({
      productId: item.productId,
      variantId: item.variantId,
      productTitle: item.productTitle,
      variantTitle: item.variantTitle ?? undefined,
      quantity: item.quantity,
      sortOrder: index,
      role: item.role,
      selectedByDefault: item.selectedByDefault,
      optional: item.optional,
    })),
    tiers: control.tiers.map((tier, index) => ({
      minQuantity: tier.minQuantity,
      discountType: tier.discountType,
      discountValue: Number(tier.discountValue),
      label: tier.label ?? undefined,
      sortOrder: index,
    })),
  });

  await updateBundleStatus(shop, challenger.id, "active");

  const experiment = await createExperiment(shop, {
    name: `${control.title} A/B`,
    controlBundleId: control.id,
    challengerBundleId: challenger.id,
  });
  await startExperiment(shop, experiment.id);

  return { experiment, challengerId: challenger.id };
}

export async function publishExperimentWinner(
  shop: string,
  experimentId: string,
  winner: "control" | "challenger",
) {
  const { getExperimentById } = await import("../models/experiment.server");
  const experiment = await getExperimentById(shop, experimentId);
  if (!experiment) return { error: "Test not found." };

  const loserId =
    winner === "control" ? experiment.challengerBundleId : experiment.controlBundleId;
  await updateBundleStatus(shop, loserId, "paused");
  await completeExperiment(shop, experimentId);
  return { ok: true };
}
