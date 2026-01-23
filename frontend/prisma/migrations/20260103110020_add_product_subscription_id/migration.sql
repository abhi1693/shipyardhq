/*
  Warnings:

  - A unique constraint covering the columns `[subscriptionId]` on the table `Product` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "subscriptionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Product_subscriptionId_key" ON "Product"("subscriptionId");
