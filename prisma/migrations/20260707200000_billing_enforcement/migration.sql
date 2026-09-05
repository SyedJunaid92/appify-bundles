-- AlterTable
ALTER TABLE "ShopBilling" ADD COLUMN "tierLimitReached" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ShopBilling" ADD COLUMN "bundlesPausedForBilling" BOOLEAN NOT NULL DEFAULT false;
