-- CreateTable
CREATE TABLE "public"."UserEntitlement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "featureKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserEntitlement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserEntitlement_userId_featureKey_idx" ON "public"."UserEntitlement"("userId", "featureKey");

-- AddForeignKey
ALTER TABLE "public"."UserEntitlement" ADD CONSTRAINT "UserEntitlement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserEntitlement" ADD CONSTRAINT "UserEntitlement_planId_fkey" FOREIGN KEY ("planId") REFERENCES "public"."Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
