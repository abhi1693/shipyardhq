/*
  Warnings:

  - The values [organization] on the enum `FeatureSubjectType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `organizationId` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the `Organization` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `OrganizationMembership` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "FeatureSubjectType_new" AS ENUM ('user', 'product', 'global');
ALTER TABLE "public"."FeatureEntitlement" ALTER COLUMN "subjectType" DROP DEFAULT;
ALTER TABLE "FeatureEntitlement" ALTER COLUMN "subjectType" TYPE "FeatureSubjectType_new" USING ("subjectType"::text::"FeatureSubjectType_new");
ALTER TYPE "FeatureSubjectType" RENAME TO "FeatureSubjectType_old";
ALTER TYPE "FeatureSubjectType_new" RENAME TO "FeatureSubjectType";
DROP TYPE "public"."FeatureSubjectType_old";
ALTER TABLE "FeatureEntitlement" ALTER COLUMN "subjectType" SET DEFAULT 'user';
COMMIT;

-- DropForeignKey
ALTER TABLE "Organization" DROP CONSTRAINT "Organization_ownerUserId_fkey";

-- DropForeignKey
ALTER TABLE "OrganizationMembership" DROP CONSTRAINT "OrganizationMembership_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "OrganizationMembership" DROP CONSTRAINT "OrganizationMembership_userId_fkey";

-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_organizationId_fkey";

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "organizationId";

-- DropTable
DROP TABLE "Organization";

-- DropTable
DROP TABLE "OrganizationMembership";
