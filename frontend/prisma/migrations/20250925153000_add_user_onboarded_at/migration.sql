-- AlterTable
ALTER TABLE "public"."User"
ADD COLUMN "onboardedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "User_onboardedAt_idx" ON "public"."User"("onboardedAt");
