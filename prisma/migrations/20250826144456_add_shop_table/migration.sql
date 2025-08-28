-- CreateTable
CREATE TABLE "Shop" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shopUrl" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'starter',
    "subscriptionChargeId" BIGINT,
    "subscriptionStatus" TEXT DEFAULT 'pending',
    "currentUsage" INTEGER NOT NULL DEFAULT 0,
    "usageLimit" INTEGER NOT NULL DEFAULT 2500,
    "usageResetDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Shop_shopUrl_key" ON "Shop"("shopUrl");

-- CreateIndex
CREATE UNIQUE INDEX "Shop_apiKey_key" ON "Shop"("apiKey");
