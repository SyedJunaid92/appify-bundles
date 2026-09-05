-- Keep one history row per shop period before adding the unique key
DELETE FROM "BillingHistory" a
USING "BillingHistory" b
WHERE a.shop = b.shop
  AND a."periodStart" = b."periodStart"
  AND a.id > b.id;

CREATE UNIQUE INDEX IF NOT EXISTS "BillingHistory_shop_periodStart_key"
ON "BillingHistory"("shop", "periodStart");

-- Merchant snapshot used when writing daily rows
CREATE TABLE IF NOT EXISTS "ShopProfile" (
    "shop" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "timezone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopProfile_pkey" PRIMARY KEY ("shop")
);

-- Shop-level daily rollup (stats queries hit this, not raw events)
CREATE TABLE IF NOT EXISTS "ShopDailyStat" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "statDate" DATE NOT NULL,
    "shopName" TEXT,
    "email" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "views" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "addToCart" INTEGER NOT NULL DEFAULT 0,
    "purchases" INTEGER NOT NULL DEFAULT 0,
    "revenue" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "orders" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopDailyStat_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ShopDailyStat_shop_statDate_key"
ON "ShopDailyStat"("shop", "statDate");

CREATE INDEX IF NOT EXISTS "ShopDailyStat_shop_statDate_idx"
ON "ShopDailyStat"("shop", "statDate" DESC);

CREATE INDEX IF NOT EXISTS "ShopDailyStat_statDate_idx"
ON "ShopDailyStat"("statDate");

-- Bundle-level daily rollup for filtered stats
CREATE TABLE IF NOT EXISTS "BundleDailyStat" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "bundleId" TEXT NOT NULL,
    "statDate" DATE NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "addToCart" INTEGER NOT NULL DEFAULT 0,
    "purchases" INTEGER NOT NULL DEFAULT 0,
    "revenue" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BundleDailyStat_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "BundleDailyStat_shop_bundleId_statDate_key"
ON "BundleDailyStat"("shop", "bundleId", "statDate");

CREATE INDEX IF NOT EXISTS "BundleDailyStat_shop_statDate_idx"
ON "BundleDailyStat"("shop", "statDate");

CREATE INDEX IF NOT EXISTS "BundleDailyStat_shop_bundleId_statDate_idx"
ON "BundleDailyStat"("shop", "bundleId", "statDate");
