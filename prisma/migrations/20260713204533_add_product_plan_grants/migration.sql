BEGIN;

-- CreateEnum
CREATE TYPE "ProductPlanGrantSource" AS ENUM ('dodo_payment', 'dodo_subscription', 'leaderboard', 'migration', 'admin');

-- CreateEnum
CREATE TYPE "ProductPlanGrantStatus" AS ENUM ('active', 'expired', 'canceled', 'refunded', 'revoked');

-- CreateTable
CREATE TABLE "ProductPlanGrant" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "externalPaymentId" TEXT,
    "externalSubscriptionId" TEXT,
    "externalCustomerId" TEXT,
    "externalRefundId" TEXT,
    "source" "ProductPlanGrantSource" NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "status" "ProductPlanGrantStatus" NOT NULL,
    "amountCents" INTEGER,
    "currencyCode" TEXT,
    "refundedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductPlanGrant_pkey" PRIMARY KEY ("id")
);

-- Backfill each current non-default product assignment as a legacy grant. One-time
-- grants retain their original assignment window. Recurring assignments cannot be
-- proven active from Product alone and stay revoked until provider reconciliation.
-- Assignments without the evidence needed to reconstruct an entitlement are revoked.
INSERT INTO "ProductPlanGrant" (
    "id",
    "productId",
    "planId",
    "externalSubscriptionId",
    "source",
    "startsAt",
    "expiresAt",
    "status",
    "metadata",
    "createdAt",
    "updatedAt"
)
SELECT
    CONCAT('migration_', MD5(product."id" || ':' || plan."id")),
    product."id",
    plan."id",
    CASE
        WHEN plan."type" = 'recurring_price'::"PlanType"
            THEN product."subscriptionId"
        ELSE NULL
    END,
    'migration'::"ProductPlanGrantSource",
    COALESCE(product."planAssignedAt", product."updatedAt", product."createdAt"),
    CASE
        WHEN plan."type" = 'one_time_price'::"PlanType" AND product."planAssignedAt" IS NOT NULL
            THEN product."planAssignedAt" + plan."boostForDays" * INTERVAL '1 day'
        ELSE NULL
    END,
    -- Product.planId is not proof of payment. Provider reconciliation promotes
    -- verified payments/subscriptions into dodo_* grants after the cutover.
    'revoked'::"ProductPlanGrantStatus",
    JSONB_BUILD_OBJECT(
        'backfilledFrom', 'Product.planId',
        'legacyPlanAssignedAt', product."planAssignedAt"
    ),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Product" AS product
INNER JOIN "Plan" AS plan ON plan."id" = product."planId"
WHERE plan."isDefault" = FALSE
  AND plan."price" > 0;

-- Keep Product as a compatibility projection, but never leave a terminal legacy
-- assignment looking paid to member pages that have not yet moved to the ledger.
WITH "defaultPlan" AS (
    SELECT "id"
    FROM "Plan"
    WHERE "isDefault" = TRUE
    ORDER BY "createdAt" DESC, "id" DESC
    LIMIT 1
)
UPDATE "Product" AS product
SET
    "planId" = "defaultPlan"."id",
    "planAssignedAt" = NULL,
    "subscriptionId" = NULL
FROM "defaultPlan"
WHERE EXISTS (
    SELECT 1
    FROM "ProductPlanGrant" AS plan_grant
    WHERE plan_grant."productId" = product."id"
)
AND NOT EXISTS (
    SELECT 1
    FROM "ProductPlanGrant" AS plan_grant
    WHERE plan_grant."productId" = product."id"
        AND plan_grant."status" = 'active'::"ProductPlanGrantStatus"
        AND plan_grant."startsAt" <= CURRENT_TIMESTAMP
        AND (plan_grant."expiresAt" IS NULL OR plan_grant."expiresAt" > CURRENT_TIMESTAMP)
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductPlanGrant_externalPaymentId_key" ON "ProductPlanGrant"("externalPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductPlanGrant_externalSubscriptionId_key" ON "ProductPlanGrant"("externalSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductPlanGrant_externalRefundId_key" ON "ProductPlanGrant"("externalRefundId");

-- CreateIndex
CREATE INDEX "ProductPlanGrant_productId_status_startsAt_expiresAt_idx" ON "ProductPlanGrant"("productId", "status", "startsAt", "expiresAt");

-- CreateIndex
CREATE INDEX "ProductPlanGrant_planId_status_idx" ON "ProductPlanGrant"("planId", "status");

-- CreateIndex
CREATE INDEX "ProductPlanGrant_status_expiresAt_idx" ON "ProductPlanGrant"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "ProductPlanGrant_externalCustomerId_idx" ON "ProductPlanGrant"("externalCustomerId");

-- CreateIndex
CREATE INDEX "ProductPlanGrant_createdAt_idx" ON "ProductPlanGrant"("createdAt");

-- CreateIndex
CREATE INDEX "ProductPlanGrant_updatedAt_idx" ON "ProductPlanGrant"("updatedAt");

-- AddForeignKey
ALTER TABLE "ProductPlanGrant" ADD CONSTRAINT "ProductPlanGrant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductPlanGrant" ADD CONSTRAINT "ProductPlanGrant_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;
