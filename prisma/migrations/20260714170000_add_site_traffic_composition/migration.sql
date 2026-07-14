CREATE TABLE "SiteTrafficCompositionDaily" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "source" "AnalyticsDataSource" NOT NULL DEFAULT 'cloudflare',
    "segment" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "requests" INTEGER NOT NULL DEFAULT 0,
    "ingestionRunId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteTrafficCompositionDaily_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SiteTrafficCompositionDaily_date_source_segment_category_key"
ON "SiteTrafficCompositionDaily"("date", "source", "segment", "category");

CREATE INDEX "SiteTrafficCompositionDaily_date_idx"
ON "SiteTrafficCompositionDaily"("date");

CREATE INDEX "SiteTrafficCompositionDaily_source_date_idx"
ON "SiteTrafficCompositionDaily"("source", "date");

CREATE INDEX "SiteTrafficCompositionDaily_segment_idx"
ON "SiteTrafficCompositionDaily"("segment");

ALTER TABLE "SiteTrafficCompositionDaily"
ADD CONSTRAINT "SiteTrafficCompositionDaily_ingestionRunId_fkey"
FOREIGN KEY ("ingestionRunId") REFERENCES "AnalyticsIngestionRun"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
