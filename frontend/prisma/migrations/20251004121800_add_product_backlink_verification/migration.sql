-- AlterTable
ALTER TABLE "ProductVerification" ADD COLUMN     "backlinkFoundUrl" TEXT,
ADD COLUMN     "backlinkIsVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "backlinkLastCheckedAt" TIMESTAMP(3),
ADD COLUMN     "backlinkLastError" TEXT,
ADD COLUMN     "backlinkVerifiedAt" TIMESTAMP(3);
