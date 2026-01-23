/*
  Warnings:

  - You are about to drop the column `latestMrrCents` on the `PaymentConnector` table. All the data in the column will be lost.
  - You are about to drop the column `mrrCents` on the `PaymentRevenueSnapshot` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "PaymentConnector" DROP COLUMN "latestMrrCents";

-- AlterTable
ALTER TABLE "PaymentRevenueSnapshot" DROP COLUMN "mrrCents";
