-- CreateTable
CREATE TABLE "SearchLog" (
    "id" BIGINT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "shopId" INTEGER NOT NULL,
    "originalQuery" TEXT NOT NULL,
    "returnedJson" TEXT NOT NULL,
    CONSTRAINT "SearchLog_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
