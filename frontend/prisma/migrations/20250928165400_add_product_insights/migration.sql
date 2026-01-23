-- CreateEnum
CREATE TYPE "public"."ProductInsightStatus" AS ENUM ('pending', 'ready', 'failed');

-- AlterTable
ALTER TABLE "public"."ProductReview" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "public"."ProductInsightProfile" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "status" "public"."ProductInsightStatus" NOT NULL DEFAULT 'pending',
    "errorMessage" TEXT,
    "lastRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductInsightProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProductInsightStageResult" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "providerType" TEXT NOT NULL,
    "status" "public"."ProductInsightStatus" NOT NULL DEFAULT 'pending',
    "data" JSONB,
    "metrics" JSONB,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductInsightStageResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductInsightProfile_productId_key" ON "public"."ProductInsightProfile"("productId");

-- CreateIndex
CREATE INDEX "ProductInsightProfile_status_idx" ON "public"."ProductInsightProfile"("status");

-- CreateIndex
CREATE INDEX "ProductInsightProfile_updatedAt_idx" ON "public"."ProductInsightProfile"("updatedAt");

-- CreateIndex
CREATE INDEX "ProductInsightStageResult_profileId_stageId_idx" ON "public"."ProductInsightStageResult"("profileId", "stageId");

-- CreateIndex
CREATE INDEX "ProductInsightStageResult_status_idx" ON "public"."ProductInsightStageResult"("status");

-- CreateIndex
CREATE INDEX "ProductInsightStageResult_updatedAt_idx" ON "public"."ProductInsightStageResult"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProductInsightStageResult_profileId_stageId_providerType_key" ON "public"."ProductInsightStageResult"("profileId", "stageId", "providerType");

-- AddForeignKey
ALTER TABLE "public"."ProductInsightProfile" ADD CONSTRAINT "ProductInsightProfile_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProductInsightStageResult" ADD CONSTRAINT "ProductInsightStageResult_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "public"."ProductInsightProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
