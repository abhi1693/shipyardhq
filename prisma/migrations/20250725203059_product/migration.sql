/*
  Warnings:

  - You are about to drop the column `description` on the `Product` table. All the data in the column will be lost.
  - Added the required column `logo` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tagline` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `websiteUrl` to the `Product` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Product" DROP COLUMN "description",
ADD COLUMN     "logo" TEXT NOT NULL,
ADD COLUMN     "tagline" TEXT NOT NULL,
ADD COLUMN     "websiteUrl" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "ProductVerification" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "verificationTxt" TEXT NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),

    CONSTRAINT "ProductVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductMetadata" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "githubUrl" TEXT,
    "twitterUrl" TEXT,
    "demoUrl" TEXT,
    "contactEmail" TEXT,

    CONSTRAINT "ProductMetadata_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductAnalytics" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "upvotes" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductVerification_productId_key" ON "ProductVerification"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductMetadata_productId_key" ON "ProductMetadata"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductAnalytics_productId_key" ON "ProductAnalytics"("productId");

-- AddForeignKey
ALTER TABLE "ProductVerification" ADD CONSTRAINT "ProductVerification_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductMetadata" ADD CONSTRAINT "ProductMetadata_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAnalytics" ADD CONSTRAINT "ProductAnalytics_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
