CREATE TABLE "SiteTrafficHourly" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "source" "AnalyticsDataSource" NOT NULL DEFAULT 'cloudflare',
    "requests" INTEGER NOT NULL DEFAULT 0,
    "visits" INTEGER NOT NULL DEFAULT 0,
    "ingestionRunId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteTrafficHourly_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SiteTrafficHourly_timestamp_source_key"
ON "SiteTrafficHourly"("timestamp", "source");

CREATE INDEX "SiteTrafficHourly_timestamp_idx"
ON "SiteTrafficHourly"("timestamp");

CREATE INDEX "SiteTrafficHourly_source_timestamp_idx"
ON "SiteTrafficHourly"("source", "timestamp");

ALTER TABLE "SiteTrafficHourly"
ADD CONSTRAINT "SiteTrafficHourly_ingestionRunId_fkey"
FOREIGN KEY ("ingestionRunId") REFERENCES "AnalyticsIngestionRun"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
