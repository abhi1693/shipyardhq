-- CreateEnum
CREATE TYPE "ProductClaimMethod" AS ENUM ('dns', 'email_otp');

-- CreateEnum
CREATE TYPE "ProductClaimStatus" AS ENUM ('pending', 'fulfilled', 'expired', 'cancelled', 'failed');

-- CreateTable
CREATE TABLE "ProductClaimAttempt" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "method" "ProductClaimMethod" NOT NULL,
    "status" "ProductClaimStatus" NOT NULL DEFAULT 'pending',
    "email" TEXT,
    "otpHash" TEXT,
    "otpExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductClaimAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductClaimAttempt_productId_status_idx" ON "ProductClaimAttempt"("productId", "status");

-- CreateIndex
CREATE INDEX "ProductClaimAttempt_userId_status_idx" ON "ProductClaimAttempt"("userId", "status");

-- AddForeignKey
ALTER TABLE "ProductClaimAttempt" ADD CONSTRAINT "ProductClaimAttempt_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductClaimAttempt" ADD CONSTRAINT "ProductClaimAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
