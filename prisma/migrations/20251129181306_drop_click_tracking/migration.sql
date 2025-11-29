/*
  Warnings:

  - You are about to drop the column `clicks` on the `ProductAnalytics` table. All the data in the column will be lost.
  - You are about to drop the column `clicks` on the `ProductLeaderboardScore` table. All the data in the column will be lost.

*/

-- AlterTable
ALTER TABLE "ProductAnalytics" DROP COLUMN "clicks";

-- AlterTable
ALTER TABLE "ProductLeaderboardScore" DROP COLUMN "clicks";
