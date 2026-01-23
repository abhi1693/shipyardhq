/*
  Warnings:

  - You are about to drop the `MonthlyProductRanking` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "MonthlyProductRanking" DROP CONSTRAINT "MonthlyProductRanking_productId_fkey";

-- DropTable
DROP TABLE "MonthlyProductRanking";
