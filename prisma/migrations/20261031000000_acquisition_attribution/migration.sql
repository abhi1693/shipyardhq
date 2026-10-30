ALTER TABLE "User" ADD COLUMN "acquisitionContext" JSONB;
CREATE TABLE "AnalyticsConversion" (
  "key" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "eventName" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'attempting',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AnalyticsConversion_pkey" PRIMARY KEY ("key")
);
CREATE INDEX "AnalyticsConversion_userId_createdAt_idx" ON "AnalyticsConversion"("userId", "createdAt");
CREATE INDEX "AnalyticsConversion_createdAt_idx" ON "AnalyticsConversion"("createdAt");
ALTER TABLE "AnalyticsConversion" ADD CONSTRAINT "AnalyticsConversion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
