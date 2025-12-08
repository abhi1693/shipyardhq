/*
  Warnings:

  - You are about to drop the `ProductUpdate` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ProductUpdate" DROP CONSTRAINT "ProductUpdate_authorId_fkey";

-- DropForeignKey
ALTER TABLE "ProductUpdate" DROP CONSTRAINT "ProductUpdate_productId_fkey";

-- DropTable
DROP TABLE "ProductUpdate";

-- DropEnum
DROP TYPE "ProductUpdateStatus";
