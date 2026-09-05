-- AlterTable
ALTER TABLE "BundleItem" ADD COLUMN IF NOT EXISTS "role" TEXT NOT NULL DEFAULT 'pool';
ALTER TABLE "BundleItem" ADD COLUMN IF NOT EXISTS "selectedByDefault" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE IF NOT EXISTS "BundleExperiment" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "controlBundleId" TEXT NOT NULL,
    "challengerBundleId" TEXT NOT NULL,
    "trafficPercent" INTEGER NOT NULL DEFAULT 50,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BundleExperiment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "BundleExperiment_shop_status_idx" ON "BundleExperiment"("shop", "status");
CREATE INDEX IF NOT EXISTS "BundleExperiment_controlBundleId_idx" ON "BundleExperiment"("controlBundleId");
