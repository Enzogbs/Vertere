/*
  Warnings:

  - The primary key for the `SearchLog` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SearchLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "shopId" INTEGER NOT NULL,
    "originalQuery" TEXT NOT NULL,
    "returnedJson" TEXT NOT NULL,
    CONSTRAINT "SearchLog_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_SearchLog" ("createdAt", "id", "originalQuery", "returnedJson", "shopId") SELECT "createdAt", "id", "originalQuery", "returnedJson", "shopId" FROM "SearchLog";
DROP TABLE "SearchLog";
ALTER TABLE "new_SearchLog" RENAME TO "SearchLog";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
