/*
  Warnings:

  - You are about to drop the column `reviewsCount` on the `ProductLeaderboardScore` table. All the data in the column will be lost.
  - You are about to drop the column `reviewsRatingSum` on the `ProductLeaderboardScore` table. All the data in the column will be lost.
  - You are about to drop the `ProductReview` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ProductReview" DROP CONSTRAINT "ProductReview_productId_fkey";

-- DropForeignKey
ALTER TABLE "ProductReview" DROP CONSTRAINT "ProductReview_userId_fkey";

-- AlterTable
ALTER TABLE "ProductLeaderboardScore" DROP COLUMN "reviewsCount",
DROP COLUMN "reviewsRatingSum";

-- DropTable
DROP TABLE "ProductReview";

-- RenameIndex
ALTER INDEX "RewardTransaction_user_rule_target_type_createdAt_idx" RENAME TO "RewardTransaction_userId_ruleKey_targetId_type_createdAt_idx";

-- RenameIndex
ALTER INDEX "RewardTransaction_user_rule_type_createdAt_idx" RENAME TO "RewardTransaction_userId_ruleKey_type_createdAt_idx";
