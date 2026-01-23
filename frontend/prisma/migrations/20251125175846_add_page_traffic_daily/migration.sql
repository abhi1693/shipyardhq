-- CreateTable
CREATE TABLE "PageTrafficDaily" (
    "date" TIMESTAMP(3) NOT NULL,
    "pageViews" INTEGER NOT NULL DEFAULT 0,
    "visitors" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PageTrafficDaily_pkey" PRIMARY KEY ("date")
);

-- CreateIndex
CREATE INDEX "PageTrafficDaily_updatedAt_idx" ON "PageTrafficDaily"("updatedAt");

-- Seed historical counts from product traffic (non-bot only)
INSERT INTO "PageTrafficDaily" ("date", "pageViews", "visitors", "createdAt", "updatedAt")
SELECT
  date_trunc('day', "createdAt") AS "date",
  COUNT(*)::int AS "pageViews",
  COUNT(DISTINCT COALESCE("ipHash", concat('anon-', "id")))::int AS "visitors",
  NOW(),
  NOW()
FROM "ProductTrafficEvent"
GROUP BY 1
ORDER BY 1;
