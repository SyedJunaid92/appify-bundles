import prisma from "../db.server";
import { invalidateStorefrontCache } from "./bundle.server";

export async function listExperiments(shop: string) {
  return prisma.bundleExperiment.findMany({
    where: { shop },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getRunningExperiments(shop: string) {
  return prisma.bundleExperiment.findMany({
    where: { shop, status: "running" },
  });
}

export async function getExperimentById(shop: string, id: string) {
  return prisma.bundleExperiment.findFirst({ where: { id, shop } });
}

export async function createExperiment(
  shop: string,
  data: {
    name: string;
    controlBundleId: string;
    challengerBundleId: string;
    trafficPercent?: number;
  },
) {
  return prisma.bundleExperiment.create({
    data: {
      shop,
      name: data.name,
      controlBundleId: data.controlBundleId,
      challengerBundleId: data.challengerBundleId,
      trafficPercent: data.trafficPercent ?? 50,
      status: "draft",
    },
  });
}

export async function startExperiment(shop: string, id: string) {
  const experiment = await prisma.bundleExperiment.update({
    where: { id },
    data: { status: "running", startedAt: new Date(), endedAt: null },
  });
  await invalidateStorefrontCache(shop);
  return experiment;
}

export async function completeExperiment(shop: string, id: string) {
  const experiment = await prisma.bundleExperiment.update({
    where: { id },
    data: { status: "completed", endedAt: new Date() },
  });
  await invalidateStorefrontCache(shop);
  return experiment;
}

export async function countRunningExperiments(shop: string) {
  return prisma.bundleExperiment.count({ where: { shop, status: "running" } });
}

export async function getExperimentForBundle(shop: string, bundleId: string) {
  return prisma.bundleExperiment.findFirst({
    where: {
      shop,
      status: "running",
      OR: [{ controlBundleId: bundleId }, { challengerBundleId: bundleId }],
    },
  });
}
