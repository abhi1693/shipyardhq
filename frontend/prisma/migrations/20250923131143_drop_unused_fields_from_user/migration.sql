/*
  Warnings:

  - You are about to drop the column `acceptedTerms` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `termsAcceptedAt` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."User" DROP COLUMN "acceptedTerms",
DROP COLUMN "termsAcceptedAt";
