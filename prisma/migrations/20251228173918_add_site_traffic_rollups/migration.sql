-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AnalyticsIngestionJob" ADD VALUE 'site_traffic_daily';
ALTER TYPE "AnalyticsIngestionJob" ADD VALUE 'site_traffic_breakdowns';

-- CreateTable
CREATE TABLE "SiteTrafficDaily" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "source" "AnalyticsDataSource" NOT NULL DEFAULT 'ga4',
    "pageViews" INTEGER NOT NULL DEFAULT 0,
    "uniqueVisitors" INTEGER NOT NULL DEFAULT 0,
    "sessions" INTEGER NOT NULL DEFAULT 0,
    "bounceRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "averageSessionDuration" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "newUsers" INTEGER NOT NULL DEFAULT 0,
    "returningVisitors" INTEGER NOT NULL DEFAULT 0,
    "engagementRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pagesPerSession" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ingestionRunId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteTrafficDaily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteTrafficReferrerDaily" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "source" "AnalyticsDataSource" NOT NULL DEFAULT 'ga4',
    "referrer" TEXT NOT NULL,
    "pageViews" INTEGER NOT NULL DEFAULT 0,
    "ingestionRunId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteTrafficReferrerDaily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteTrafficBrowserDaily" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "source" "AnalyticsDataSource" NOT NULL DEFAULT 'ga4',
    "browser" TEXT NOT NULL,
    "visitors" INTEGER NOT NULL DEFAULT 0,
    "ingestionRunId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteTrafficBrowserDaily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteTrafficOperatingSystemDaily" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "source" "AnalyticsDataSource" NOT NULL DEFAULT 'ga4',
    "operatingSystem" TEXT NOT NULL,
    "visitors" INTEGER NOT NULL DEFAULT 0,
    "ingestionRunId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteTrafficOperatingSystemDaily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteTrafficDeviceDaily" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "source" "AnalyticsDataSource" NOT NULL DEFAULT 'ga4',
    "deviceCategory" TEXT NOT NULL,
    "visitors" INTEGER NOT NULL DEFAULT 0,
    "ingestionRunId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteTrafficDeviceDaily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteTrafficCountryDaily" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "source" "AnalyticsDataSource" NOT NULL DEFAULT 'ga4',
    "country" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "visitors" INTEGER NOT NULL DEFAULT 0,
    "ingestionRunId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteTrafficCountryDaily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteTrafficRegionDaily" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "source" "AnalyticsDataSource" NOT NULL DEFAULT 'ga4',
    "region" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "visitors" INTEGER NOT NULL DEFAULT 0,
    "ingestionRunId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteTrafficRegionDaily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteTrafficCityDaily" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "source" "AnalyticsDataSource" NOT NULL DEFAULT 'ga4',
    "city" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "visitors" INTEGER NOT NULL DEFAULT 0,
    "ingestionRunId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteTrafficCityDaily_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SiteTrafficDaily_date_idx" ON "SiteTrafficDaily"("date");

-- CreateIndex
CREATE INDEX "SiteTrafficDaily_source_date_idx" ON "SiteTrafficDaily"("source", "date");

-- CreateIndex
CREATE UNIQUE INDEX "SiteTrafficDaily_date_source_key" ON "SiteTrafficDaily"("date", "source");

-- CreateIndex
CREATE INDEX "SiteTrafficReferrerDaily_date_idx" ON "SiteTrafficReferrerDaily"("date");

-- CreateIndex
CREATE INDEX "SiteTrafficReferrerDaily_referrer_idx" ON "SiteTrafficReferrerDaily"("referrer");

-- CreateIndex
CREATE UNIQUE INDEX "SiteTrafficReferrerDaily_date_source_referrer_key" ON "SiteTrafficReferrerDaily"("date", "source", "referrer");

-- CreateIndex
CREATE INDEX "SiteTrafficBrowserDaily_date_idx" ON "SiteTrafficBrowserDaily"("date");

-- CreateIndex
CREATE INDEX "SiteTrafficBrowserDaily_browser_idx" ON "SiteTrafficBrowserDaily"("browser");

-- CreateIndex
CREATE UNIQUE INDEX "SiteTrafficBrowserDaily_date_source_browser_key" ON "SiteTrafficBrowserDaily"("date", "source", "browser");

-- CreateIndex
CREATE INDEX "SiteTrafficOperatingSystemDaily_date_idx" ON "SiteTrafficOperatingSystemDaily"("date");

-- CreateIndex
CREATE INDEX "SiteTrafficOperatingSystemDaily_operatingSystem_idx" ON "SiteTrafficOperatingSystemDaily"("operatingSystem");

-- CreateIndex
CREATE UNIQUE INDEX "SiteTrafficOperatingSystemDaily_date_source_operatingSystem_key" ON "SiteTrafficOperatingSystemDaily"("date", "source", "operatingSystem");

-- CreateIndex
CREATE INDEX "SiteTrafficDeviceDaily_date_idx" ON "SiteTrafficDeviceDaily"("date");

-- CreateIndex
CREATE INDEX "SiteTrafficDeviceDaily_deviceCategory_idx" ON "SiteTrafficDeviceDaily"("deviceCategory");

-- CreateIndex
CREATE UNIQUE INDEX "SiteTrafficDeviceDaily_date_source_deviceCategory_key" ON "SiteTrafficDeviceDaily"("date", "source", "deviceCategory");

-- CreateIndex
CREATE INDEX "SiteTrafficCountryDaily_date_idx" ON "SiteTrafficCountryDaily"("date");

-- CreateIndex
CREATE INDEX "SiteTrafficCountryDaily_country_idx" ON "SiteTrafficCountryDaily"("country");

-- CreateIndex
CREATE UNIQUE INDEX "SiteTrafficCountryDaily_date_source_country_countryCode_key" ON "SiteTrafficCountryDaily"("date", "source", "country", "countryCode");

-- CreateIndex
CREATE INDEX "SiteTrafficRegionDaily_date_idx" ON "SiteTrafficRegionDaily"("date");

-- CreateIndex
CREATE INDEX "SiteTrafficRegionDaily_region_idx" ON "SiteTrafficRegionDaily"("region");

-- CreateIndex
CREATE UNIQUE INDEX "SiteTrafficRegionDaily_date_source_region_country_countryCo_key" ON "SiteTrafficRegionDaily"("date", "source", "region", "country", "countryCode");

-- CreateIndex
CREATE INDEX "SiteTrafficCityDaily_date_idx" ON "SiteTrafficCityDaily"("date");

-- CreateIndex
CREATE INDEX "SiteTrafficCityDaily_city_idx" ON "SiteTrafficCityDaily"("city");

-- CreateIndex
CREATE UNIQUE INDEX "SiteTrafficCityDaily_date_source_city_region_country_countr_key" ON "SiteTrafficCityDaily"("date", "source", "city", "region", "country", "countryCode");

-- AddForeignKey
ALTER TABLE "SiteTrafficDaily" ADD CONSTRAINT "SiteTrafficDaily_ingestionRunId_fkey" FOREIGN KEY ("ingestionRunId") REFERENCES "AnalyticsIngestionRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteTrafficReferrerDaily" ADD CONSTRAINT "SiteTrafficReferrerDaily_ingestionRunId_fkey" FOREIGN KEY ("ingestionRunId") REFERENCES "AnalyticsIngestionRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteTrafficBrowserDaily" ADD CONSTRAINT "SiteTrafficBrowserDaily_ingestionRunId_fkey" FOREIGN KEY ("ingestionRunId") REFERENCES "AnalyticsIngestionRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteTrafficOperatingSystemDaily" ADD CONSTRAINT "SiteTrafficOperatingSystemDaily_ingestionRunId_fkey" FOREIGN KEY ("ingestionRunId") REFERENCES "AnalyticsIngestionRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteTrafficDeviceDaily" ADD CONSTRAINT "SiteTrafficDeviceDaily_ingestionRunId_fkey" FOREIGN KEY ("ingestionRunId") REFERENCES "AnalyticsIngestionRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteTrafficCountryDaily" ADD CONSTRAINT "SiteTrafficCountryDaily_ingestionRunId_fkey" FOREIGN KEY ("ingestionRunId") REFERENCES "AnalyticsIngestionRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteTrafficRegionDaily" ADD CONSTRAINT "SiteTrafficRegionDaily_ingestionRunId_fkey" FOREIGN KEY ("ingestionRunId") REFERENCES "AnalyticsIngestionRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteTrafficCityDaily" ADD CONSTRAINT "SiteTrafficCityDaily_ingestionRunId_fkey" FOREIGN KEY ("ingestionRunId") REFERENCES "AnalyticsIngestionRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
