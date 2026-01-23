/*
  Warnings:

  - You are about to drop the `ProductInsightProfile` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProductInsightStageResult` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ProductInsightProfile" DROP CONSTRAINT "ProductInsightProfile_productId_fkey";

-- DropForeignKey
ALTER TABLE "ProductInsightStageResult" DROP CONSTRAINT "ProductInsightStageResult_profileId_fkey";

-- DropTable
DROP TABLE "ProductInsightProfile";

-- DropTable
DROP TABLE "ProductInsightStageResult";

-- DropEnum
DROP TYPE "ProductInsightStatus";
