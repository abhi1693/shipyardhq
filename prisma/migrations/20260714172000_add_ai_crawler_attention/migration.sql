CREATE TABLE "SiteAiCrawlerStatusDaily" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "source" "AnalyticsDataSource" NOT NULL DEFAULT 'cloudflare',
    "category" TEXT NOT NULL,
    "crawlStatus" TEXT NOT NULL,
    "responseStatus" INTEGER NOT NULL,
    "requests" INTEGER NOT NULL DEFAULT 0,
    "ingestionRunId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteAiCrawlerStatusDaily_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SiteAiCrawlerEndpointDaily" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "source" "AnalyticsDataSource" NOT NULL DEFAULT 'cloudflare',
    "category" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "matchedEndpoint" TEXT NOT NULL DEFAULT '',
    "managedLabels" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "requests" INTEGER NOT NULL DEFAULT 0,
    "ingestionRunId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteAiCrawlerEndpointDaily_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SiteAiCrawlerStatusDaily_date_source_category_crawlStatus_responseStatus_key"
ON "SiteAiCrawlerStatusDaily"("date", "source", "category", "crawlStatus", "responseStatus");
CREATE INDEX "SiteAiCrawlerStatusDaily_date_idx" ON "SiteAiCrawlerStatusDaily"("date");
CREATE INDEX "SiteAiCrawlerStatusDaily_source_date_idx" ON "SiteAiCrawlerStatusDaily"("source", "date");
CREATE INDEX "SiteAiCrawlerStatusDaily_category_idx" ON "SiteAiCrawlerStatusDaily"("category");
CREATE INDEX "SiteAiCrawlerStatusDaily_responseStatus_idx" ON "SiteAiCrawlerStatusDaily"("responseStatus");

CREATE UNIQUE INDEX "SiteAiCrawlerEndpointDaily_date_source_category_endpoint_matchedEndpoint_key"
ON "SiteAiCrawlerEndpointDaily"("date", "source", "category", "endpoint", "matchedEndpoint");
CREATE INDEX "SiteAiCrawlerEndpointDaily_date_idx" ON "SiteAiCrawlerEndpointDaily"("date");
CREATE INDEX "SiteAiCrawlerEndpointDaily_source_date_idx" ON "SiteAiCrawlerEndpointDaily"("source", "date");
CREATE INDEX "SiteAiCrawlerEndpointDaily_category_idx" ON "SiteAiCrawlerEndpointDaily"("category");
CREATE INDEX "SiteAiCrawlerEndpointDaily_endpoint_idx" ON "SiteAiCrawlerEndpointDaily"("endpoint");

ALTER TABLE "SiteAiCrawlerStatusDaily"
ADD CONSTRAINT "SiteAiCrawlerStatusDaily_ingestionRunId_fkey"
FOREIGN KEY ("ingestionRunId") REFERENCES "AnalyticsIngestionRun"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SiteAiCrawlerEndpointDaily"
ADD CONSTRAINT "SiteAiCrawlerEndpointDaily_ingestionRunId_fkey"
FOREIGN KEY ("ingestionRunId") REFERENCES "AnalyticsIngestionRun"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
