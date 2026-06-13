CREATE TABLE "public"."ProductDraft" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'member',
    "currentStep" TEXT NOT NULL DEFAULT 'configuration',
    "payload" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductDraft_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProductDraft_productId_key" ON "public"."ProductDraft"("productId");
CREATE INDEX "ProductDraft_userId_updatedAt_idx" ON "public"."ProductDraft"("userId", "updatedAt");
CREATE INDEX "ProductDraft_currentStep_idx" ON "public"."ProductDraft"("currentStep");
CREATE INDEX "ProductDraft_createdAt_idx" ON "public"."ProductDraft"("createdAt");
CREATE INDEX "ProductDraft_updatedAt_idx" ON "public"."ProductDraft"("updatedAt");

ALTER TABLE "public"."ProductDraft"
ADD CONSTRAINT "ProductDraft_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "public"."User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
