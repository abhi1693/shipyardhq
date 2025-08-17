/*
  Warnings:

  - You are about to drop the column `planId` on the `Organization` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Organization" DROP CONSTRAINT "Organization_planId_fkey";

-- AlterTable
ALTER TABLE "public"."Organization" DROP COLUMN "planId";

-- CreateTable
CREATE TABLE "public"."UserPlanPurchase" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "externalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPlanPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserPlanPurchase_externalId_key" ON "public"."UserPlanPurchase"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "UserPlanPurchase_userId_planId_key" ON "public"."UserPlanPurchase"("userId", "planId");

-- AddForeignKey
ALTER TABLE "public"."UserPlanPurchase" ADD CONSTRAINT "UserPlanPurchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserPlanPurchase" ADD CONSTRAINT "UserPlanPurchase_planId_fkey" FOREIGN KEY ("planId") REFERENCES "public"."Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
