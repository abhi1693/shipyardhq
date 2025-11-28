/*
  Warnings:

  - You are about to drop the column `clicks` on the `ProductAnalytics` table. All the data in the column will be lost.
  - You are about to drop the `ProductClickEvent` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProductTrafficEvent` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ProductClickEvent" DROP CONSTRAINT "ProductClickEvent_productId_fkey";

-- DropForeignKey
ALTER TABLE "ProductTrafficEvent" DROP CONSTRAINT "ProductTrafficEvent_productId_fkey";

-- AlterTable
ALTER TABLE "ProductAnalytics" DROP COLUMN "clicks";

-- DropTable
DROP TABLE "ProductClickEvent";

-- DropTable
DROP TABLE "ProductTrafficEvent";

-- DropEnum
DROP TYPE "DeviceCategory";
