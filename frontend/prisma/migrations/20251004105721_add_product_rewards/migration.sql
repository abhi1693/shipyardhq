-- CreateEnum
CREATE TYPE "RewardTransactionType" AS ENUM ('earn', 'spend', 'adjustment', 'refund');

-- CreateEnum
CREATE TYPE "RedemptionStatus" AS ENUM ('pending', 'active', 'expired', 'canceled', 'failed', 'refunded');

-- CreateEnum
CREATE TYPE "PlacementStatus" AS ENUM ('pending', 'scheduled', 'active', 'completed', 'canceled', 'failed');

-- CreateEnum
CREATE TYPE "RewardRuleCategory" AS ENUM ('engagement', 'streak', 'admin', 'system', 'bonus');

-- CreateEnum
CREATE TYPE "RewardFeatureCategory" AS ENUM ('placement', 'analytics', 'insights', 'access', 'exposure', 'utility');

-- CreateEnum
CREATE TYPE "FeatureSubjectType" AS ENUM ('user', 'product', 'organization', 'global');

-- CreateEnum
CREATE TYPE "FeatureEntitlementStatus" AS ENUM ('pending', 'active', 'paused', 'expired', 'canceled', 'failed');

-- CreateTable
CREATE TABLE "RewardBalance" (
    "userId" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "lifetimeEarned" INTEGER NOT NULL DEFAULT 0,
    "lifetimeSpent" INTEGER NOT NULL DEFAULT 0,
    "lifetimeAdjusted" INTEGER NOT NULL DEFAULT 0,
    "lifetimeRefunded" INTEGER NOT NULL DEFAULT 0,
    "currentStreakCount" INTEGER NOT NULL DEFAULT 0,
    "longestStreakCount" INTEGER NOT NULL DEFAULT 0,
    "currentStreakTier" TEXT,
    "streakActiveThrough" TIMESTAMP(3),
    "lastEarnedAt" TIMESTAMP(3),
    "lastRedeemedAt" TIMESTAMP(3),
    "lastAdjustmentAt" TIMESTAMP(3),
    "lastEvaluatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RewardBalance_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "RewardRule" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "RewardRuleCategory" NOT NULL,
    "baseRewardAmount" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "dailyCap" INTEGER,
    "lifetimeCap" INTEGER,
    "globalCooldownSeconds" INTEGER,
    "perTargetCooldownSeconds" INTEGER,
    "metadata" JSONB,
    "tierConfig" JSONB,
    "adminNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RewardRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RewardCatalogItem" (
    "id" TEXT NOT NULL,
    "featureKey" TEXT NOT NULL,
    "planFeatureKey" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "RewardFeatureCategory" NOT NULL,
    "baseCost" INTEGER NOT NULL,
    "durationSeconds" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "maxActivePerUser" INTEGER,
    "maxPendingPerUser" INTEGER,
    "requiresProduct" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RewardCatalogItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RewardTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "RewardTransactionType" NOT NULL,
    "rewardAmount" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "ruleId" TEXT,
    "ruleKey" TEXT,
    "rewardKey" TEXT,
    "redemptionId" TEXT,
    "productId" TEXT,
    "eventId" TEXT,
    "eventHash" TEXT,
    "sourceType" TEXT,
    "sourceId" TEXT,
    "targetType" TEXT,
    "targetId" TEXT,
    "notes" TEXT,
    "metadata" JSONB,
    "actedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RewardTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Redemption" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "featureKey" TEXT NOT NULL,
    "productId" TEXT,
    "status" "RedemptionStatus" NOT NULL DEFAULT 'pending',
    "cost" INTEGER NOT NULL,
    "originalCost" INTEGER NOT NULL,
    "refundedRewards" INTEGER NOT NULL DEFAULT 0,
    "startsAt" TIMESTAMP(3),
    "activatedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Redemption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureEntitlement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "featureKey" TEXT NOT NULL,
    "redemptionId" TEXT,
    "productId" TEXT,
    "subjectType" "FeatureSubjectType" NOT NULL DEFAULT 'user',
    "subjectId" TEXT,
    "status" "FeatureEntitlementStatus" NOT NULL DEFAULT 'pending',
    "startsAt" TIMESTAMP(3),
    "activatedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "deactivatedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeatureEntitlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlacementSchedule" (
    "id" TEXT NOT NULL,
    "entitlementId" TEXT NOT NULL,
    "redemptionId" TEXT,
    "featureKey" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "slotKey" TEXT NOT NULL,
    "status" "PlacementStatus" NOT NULL DEFAULT 'pending',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "activationJobId" TEXT,
    "deactivationJobId" TEXT,
    "inventoryToken" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlacementSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RewardBalance_balance_idx" ON "RewardBalance"("balance");

-- CreateIndex
CREATE INDEX "RewardBalance_updatedAt_idx" ON "RewardBalance"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "RewardRule_key_key" ON "RewardRule"("key");

-- CreateIndex
CREATE INDEX "RewardRule_category_idx" ON "RewardRule"("category");

-- CreateIndex
CREATE INDEX "RewardRule_isActive_idx" ON "RewardRule"("isActive");

-- CreateIndex
CREATE INDEX "RewardRule_updatedAt_idx" ON "RewardRule"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "RewardCatalogItem_featureKey_key" ON "RewardCatalogItem"("featureKey");

-- CreateIndex
CREATE INDEX "RewardCatalogItem_category_idx" ON "RewardCatalogItem"("category");

-- CreateIndex
CREATE INDEX "RewardCatalogItem_isActive_idx" ON "RewardCatalogItem"("isActive");

-- CreateIndex
CREATE INDEX "RewardCatalogItem_updatedAt_idx" ON "RewardCatalogItem"("updatedAt");

-- CreateIndex
CREATE INDEX "RewardTransaction_userId_createdAt_idx" ON "RewardTransaction"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "RewardTransaction_type_idx" ON "RewardTransaction"("type");

-- CreateIndex
CREATE INDEX "RewardTransaction_ruleKey_idx" ON "RewardTransaction"("ruleKey");

-- CreateIndex
CREATE INDEX "RewardTransaction_rewardKey_idx" ON "RewardTransaction"("rewardKey");

-- CreateIndex
CREATE INDEX "RewardTransaction_productId_idx" ON "RewardTransaction"("productId");

-- CreateIndex
CREATE INDEX "RewardTransaction_eventId_idx" ON "RewardTransaction"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "RewardTransaction_eventHash_key" ON "RewardTransaction"("eventHash");

-- CreateIndex
CREATE INDEX "Redemption_userId_status_idx" ON "Redemption"("userId", "status");

-- CreateIndex
CREATE INDEX "Redemption_featureKey_idx" ON "Redemption"("featureKey");

-- CreateIndex
CREATE INDEX "Redemption_productId_idx" ON "Redemption"("productId");

-- CreateIndex
CREATE INDEX "Redemption_createdAt_idx" ON "Redemption"("createdAt");

-- CreateIndex
CREATE INDEX "FeatureEntitlement_userId_featureKey_status_idx" ON "FeatureEntitlement"("userId", "featureKey", "status");

-- CreateIndex
CREATE INDEX "FeatureEntitlement_featureKey_status_idx" ON "FeatureEntitlement"("featureKey", "status");

-- CreateIndex
CREATE INDEX "FeatureEntitlement_productId_status_idx" ON "FeatureEntitlement"("productId", "status");

-- CreateIndex
CREATE INDEX "FeatureEntitlement_subjectType_subjectId_idx" ON "FeatureEntitlement"("subjectType", "subjectId");

-- CreateIndex
CREATE INDEX "PlacementSchedule_slotKey_startsAt_idx" ON "PlacementSchedule"("slotKey", "startsAt");

-- CreateIndex
CREATE INDEX "PlacementSchedule_status_idx" ON "PlacementSchedule"("status");

-- CreateIndex
CREATE INDEX "PlacementSchedule_productId_startsAt_idx" ON "PlacementSchedule"("productId", "startsAt");

-- CreateIndex
CREATE INDEX "PlacementSchedule_featureKey_status_idx" ON "PlacementSchedule"("featureKey", "status");

-- AddForeignKey
ALTER TABLE "RewardBalance" ADD CONSTRAINT "RewardBalance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardCatalogItem" ADD CONSTRAINT "RewardCatalogItem_planFeatureKey_fkey" FOREIGN KEY ("planFeatureKey") REFERENCES "PlanFeature"("key") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardTransaction" ADD CONSTRAINT "RewardTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardTransaction" ADD CONSTRAINT "RewardTransaction_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "RewardRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardTransaction" ADD CONSTRAINT "RewardTransaction_rewardKey_fkey" FOREIGN KEY ("rewardKey") REFERENCES "RewardCatalogItem"("featureKey") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardTransaction" ADD CONSTRAINT "RewardTransaction_redemptionId_fkey" FOREIGN KEY ("redemptionId") REFERENCES "Redemption"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardTransaction" ADD CONSTRAINT "RewardTransaction_actedByUserId_fkey" FOREIGN KEY ("actedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardTransaction" ADD CONSTRAINT "RewardTransaction_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Redemption" ADD CONSTRAINT "Redemption_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Redemption" ADD CONSTRAINT "Redemption_featureKey_fkey" FOREIGN KEY ("featureKey") REFERENCES "RewardCatalogItem"("featureKey") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Redemption" ADD CONSTRAINT "Redemption_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeatureEntitlement" ADD CONSTRAINT "FeatureEntitlement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeatureEntitlement" ADD CONSTRAINT "FeatureEntitlement_featureKey_fkey" FOREIGN KEY ("featureKey") REFERENCES "RewardCatalogItem"("featureKey") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeatureEntitlement" ADD CONSTRAINT "FeatureEntitlement_redemptionId_fkey" FOREIGN KEY ("redemptionId") REFERENCES "Redemption"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeatureEntitlement" ADD CONSTRAINT "FeatureEntitlement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlacementSchedule" ADD CONSTRAINT "PlacementSchedule_entitlementId_fkey" FOREIGN KEY ("entitlementId") REFERENCES "FeatureEntitlement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlacementSchedule" ADD CONSTRAINT "PlacementSchedule_redemptionId_fkey" FOREIGN KEY ("redemptionId") REFERENCES "Redemption"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlacementSchedule" ADD CONSTRAINT "PlacementSchedule_featureKey_fkey" FOREIGN KEY ("featureKey") REFERENCES "RewardCatalogItem"("featureKey") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlacementSchedule" ADD CONSTRAINT "PlacementSchedule_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
