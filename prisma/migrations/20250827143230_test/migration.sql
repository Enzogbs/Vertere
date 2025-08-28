/*
  Warnings:

  - Added the required column `accessToken` to the `Shop` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Shop" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shopUrl" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'starter',
    "subscriptionChargeId" BIGINT,
    "accessToken" TEXT NOT NULL,
    "subscriptionStatus" TEXT DEFAULT 'pending',
    "currentUsage" INTEGER NOT NULL DEFAULT 0,
    "usageLimit" INTEGER NOT NULL DEFAULT 2500,
    "usageResetDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "filters" TEXT,
    "sorts" TEXT
);
INSERT INTO "new_Shop" ("apiKey", "currentUsage", "filters", "id", "plan", "shopUrl", "sorts", "subscriptionChargeId", "subscriptionStatus", "usageLimit", "usageResetDate") SELECT "apiKey", "currentUsage", "filters", "id", "plan", "shopUrl", "sorts", "subscriptionChargeId", "subscriptionStatus", "usageLimit", "usageResetDate" FROM "Shop";
DROP TABLE "Shop";
ALTER TABLE "new_Shop" RENAME TO "Shop";
CREATE UNIQUE INDEX "Shop_shopUrl_key" ON "Shop"("shopUrl");
CREATE UNIQUE INDEX "Shop_apiKey_key" ON "Shop"("apiKey");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
