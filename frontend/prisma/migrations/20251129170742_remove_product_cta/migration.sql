/*
  Warnings:

  - You are about to drop the column `ctaLabel` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `ctaUrl` on the `Product` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Product" DROP COLUMN "ctaLabel",
DROP COLUMN "ctaUrl";
