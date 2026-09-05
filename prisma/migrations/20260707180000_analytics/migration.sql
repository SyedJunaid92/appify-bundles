-- CreateTable
CREATE TABLE "BundleAnalyticsEvent" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "bundleId" TEXT,
    "eventType" TEXT NOT NULL,
    "revenue" DECIMAL(10,2),
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BundleAnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BundleAnalyticsEvent_shop_createdAt_idx" ON "BundleAnalyticsEvent"("shop", "createdAt");

-- CreateIndex
CREATE INDEX "BundleAnalyticsEvent_shop_bundleId_eventType_idx" ON "BundleAnalyticsEvent"("shop", "bundleId", "eventType");

-- CreateIndex
CREATE INDEX "BundleAnalyticsEvent_shop_eventType_createdAt_idx" ON "BundleAnalyticsEvent"("shop", "eventType", "createdAt");
