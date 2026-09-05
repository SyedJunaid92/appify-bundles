-- AlterTable
ALTER TABLE "ShopBilling" ADD COLUMN "subscriptionStatus" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "BillingHistory_shopifyChargeId_key" ON "BillingHistory"("shopifyChargeId");
