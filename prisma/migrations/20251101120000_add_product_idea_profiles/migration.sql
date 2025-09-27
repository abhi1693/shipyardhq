-- CreateEnum
CREATE TYPE "ProductIdeaProfileStatus" AS ENUM ('pending', 'ready', 'failed');

-- CreateTable
CREATE TABLE "ProductIdeaProfile" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sitemapUrl" TEXT,
    "discoveredUrls" JSONB,
    "pages" JSONB,
    "summary" JSONB,
    "summaryText" TEXT,
    "status" "ProductIdeaProfileStatus" NOT NULL DEFAULT 'pending',
    "errorMessage" TEXT,
    "model" TEXT,
    "promptTokens" INTEGER,
    "completionTokens" INTEGER,
    "totalTokens" INTEGER,
    "lastCrawledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProductIdeaProfile_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ProductIdeaProfile_productId_fkey"
      FOREIGN KEY ("productId") REFERENCES "Product"("id")
      ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductIdeaProfile_productId_key" ON "ProductIdeaProfile"("productId");
CREATE INDEX "ProductIdeaProfile_status_idx" ON "ProductIdeaProfile"("status");
CREATE INDEX "ProductIdeaProfile_updatedAt_idx" ON "ProductIdeaProfile"("updatedAt");

