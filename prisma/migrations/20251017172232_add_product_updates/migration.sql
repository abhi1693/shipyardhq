-- CreateEnum
CREATE TYPE "ProductUpdateStatus" AS ENUM ('draft', 'published');

-- CreateTable
CREATE TABLE "ProductUpdate" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "authorId" TEXT,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "content" TEXT NOT NULL,
    "status" "ProductUpdateStatus" NOT NULL DEFAULT 'published',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductUpdate_productId_status_idx" ON "ProductUpdate"("productId", "status");

-- CreateIndex
CREATE INDEX "ProductUpdate_productId_createdAt_idx" ON "ProductUpdate"("productId", "createdAt");

-- CreateIndex
CREATE INDEX "ProductUpdate_createdAt_idx" ON "ProductUpdate"("createdAt");

-- CreateIndex
CREATE INDEX "ProductUpdate_updatedAt_idx" ON "ProductUpdate"("updatedAt");

-- AddForeignKey
ALTER TABLE "ProductUpdate" ADD CONSTRAINT "ProductUpdate_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductUpdate" ADD CONSTRAINT "ProductUpdate_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
