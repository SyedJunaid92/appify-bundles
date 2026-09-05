-- CreateTable
CREATE TABLE "ShopBilling" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "activePlan" TEXT,
    "shopifySubscriptionId" TEXT,
    "monthlyOrderCount" INTEGER NOT NULL DEFAULT 0,
    "orderCountPeriodStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopBilling_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingHistory" (
    "id" TEXT NOT NULL,
    "shopBillingId" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "orderCount" INTEGER NOT NULL,
    "planKey" TEXT NOT NULL,
    "baseAmount" DECIMAL(10,2) NOT NULL,
    "usageAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "shopifyChargeId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillingHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderEvent" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShopBilling_shop_key" ON "ShopBilling"("shop");

-- CreateIndex
CREATE INDEX "BillingHistory_shop_periodStart_idx" ON "BillingHistory"("shop", "periodStart");

-- CreateIndex
CREATE INDEX "BillingHistory_shopBillingId_idx" ON "BillingHistory"("shopBillingId");

-- CreateIndex
CREATE UNIQUE INDEX "OrderEvent_shop_orderId_key" ON "OrderEvent"("shop", "orderId");

-- CreateIndex
CREATE INDEX "OrderEvent_shop_createdAt_idx" ON "OrderEvent"("shop", "createdAt");

-- AddForeignKey
ALTER TABLE "BillingHistory" ADD CONSTRAINT "BillingHistory_shopBillingId_fkey" FOREIGN KEY ("shopBillingId") REFERENCES "ShopBilling"("id") ON DELETE CASCADE ON UPDATE CASCADE;
