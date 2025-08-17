/*
  Warnings:

  - You are about to drop the `UserEntitlement` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."UserEntitlement" DROP CONSTRAINT "UserEntitlement_planId_fkey";

-- DropForeignKey
ALTER TABLE "public"."UserEntitlement" DROP CONSTRAINT "UserEntitlement_userId_fkey";

-- AlterTable
ALTER TABLE "public"."Organization" ADD COLUMN     "planId" TEXT;

-- DropTable
DROP TABLE "public"."UserEntitlement";

-- AddForeignKey
ALTER TABLE "public"."Organization" ADD CONSTRAINT "Organization_planId_fkey" FOREIGN KEY ("planId") REFERENCES "public"."Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
