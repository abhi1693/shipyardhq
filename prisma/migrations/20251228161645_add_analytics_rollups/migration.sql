-- CreateEnum
CREATE TYPE "AnalyticsDataSource" AS ENUM ('ga4');

-- CreateEnum
CREATE TYPE "AnalyticsIngestionStatus" AS ENUM ('pending', 'processing', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "AnalyticsIngestionJob" AS ENUM ('product_traffic_daily', 'product_traffic_breakdowns');

-- CreateTable
CREATE TABLE "AnalyticsIngestionRun" (
    "id" TEXT NOT NULL,
    "source" "AnalyticsDataSource" NOT NULL DEFAULT 'ga4',
    "job" "AnalyticsIngestionJob" NOT NULL,
    "status" "AnalyticsIngestionStatus" NOT NULL DEFAULT 'pending',
    "windowStart" TIMESTAMP(3) NOT NULL,
    "windowEnd" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "stats" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnalyticsIngestionRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductTrafficDaily" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
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

    CONSTRAINT "ProductTrafficDaily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductTrafficReferrerDaily" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "source" "AnalyticsDataSource" NOT NULL DEFAULT 'ga4',
    "referrer" TEXT NOT NULL,
    "pageViews" INTEGER NOT NULL DEFAULT 0,
    "ingestionRunId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductTrafficReferrerDaily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductTrafficChannelDaily" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "source" "AnalyticsDataSource" NOT NULL DEFAULT 'ga4',
    "channel" TEXT NOT NULL,
    "pageViews" INTEGER NOT NULL DEFAULT 0,
    "ingestionRunId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductTrafficChannelDaily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductTrafficBrowserDaily" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "source" "AnalyticsDataSource" NOT NULL DEFAULT 'ga4',
    "browser" TEXT NOT NULL,
    "visitors" INTEGER NOT NULL DEFAULT 0,
    "ingestionRunId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductTrafficBrowserDaily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductTrafficOperatingSystemDaily" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "source" "AnalyticsDataSource" NOT NULL DEFAULT 'ga4',
    "operatingSystem" TEXT NOT NULL,
    "visitors" INTEGER NOT NULL DEFAULT 0,
    "ingestionRunId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductTrafficOperatingSystemDaily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductTrafficDeviceDaily" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "source" "AnalyticsDataSource" NOT NULL DEFAULT 'ga4',
    "deviceCategory" TEXT NOT NULL,
    "visitors" INTEGER NOT NULL DEFAULT 0,
    "ingestionRunId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductTrafficDeviceDaily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductTrafficCountryDaily" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "source" "AnalyticsDataSource" NOT NULL DEFAULT 'ga4',
    "country" TEXT NOT NULL DEFAULT 'Unknown',
    "countryCode" TEXT NOT NULL DEFAULT '',
    "visitors" INTEGER NOT NULL DEFAULT 0,
    "ingestionRunId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductTrafficCountryDaily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductTrafficCityDaily" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "source" "AnalyticsDataSource" NOT NULL DEFAULT 'ga4',
    "city" TEXT NOT NULL DEFAULT 'Unknown',
    "region" TEXT NOT NULL DEFAULT 'Unknown',
    "country" TEXT NOT NULL DEFAULT 'Unknown',
    "countryCode" TEXT NOT NULL DEFAULT '',
    "visitors" INTEGER NOT NULL DEFAULT 0,
    "ingestionRunId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductTrafficCityDaily_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AnalyticsIngestionRun_status_createdAt_idx" ON "AnalyticsIngestionRun"("status", "createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsIngestionRun_job_source_windowStart_idx" ON "AnalyticsIngestionRun"("job", "source", "windowStart");

-- CreateIndex
CREATE INDEX "AnalyticsIngestionRun_windowStart_windowEnd_idx" ON "AnalyticsIngestionRun"("windowStart", "windowEnd");

-- CreateIndex
CREATE UNIQUE INDEX "AnalyticsIngestionRun_source_job_windowStart_windowEnd_key" ON "AnalyticsIngestionRun"("source", "job", "windowStart", "windowEnd");

-- CreateIndex
CREATE INDEX "ProductTrafficDaily_productId_date_idx" ON "ProductTrafficDaily"("productId", "date");

-- CreateIndex
CREATE INDEX "ProductTrafficDaily_date_idx" ON "ProductTrafficDaily"("date");

-- CreateIndex
CREATE INDEX "ProductTrafficDaily_source_date_idx" ON "ProductTrafficDaily"("source", "date");

-- CreateIndex
CREATE UNIQUE INDEX "ProductTrafficDaily_productId_date_source_key" ON "ProductTrafficDaily"("productId", "date", "source");

-- CreateIndex
CREATE INDEX "ProductTrafficReferrerDaily_productId_date_idx" ON "ProductTrafficReferrerDaily"("productId", "date");

-- CreateIndex
CREATE INDEX "ProductTrafficReferrerDaily_referrer_idx" ON "ProductTrafficReferrerDaily"("referrer");

-- CreateIndex
CREATE UNIQUE INDEX "ProductTrafficReferrerDaily_productId_date_source_referrer_key" ON "ProductTrafficReferrerDaily"("productId", "date", "source", "referrer");

-- CreateIndex
CREATE INDEX "ProductTrafficChannelDaily_productId_date_idx" ON "ProductTrafficChannelDaily"("productId", "date");

-- CreateIndex
CREATE INDEX "ProductTrafficChannelDaily_channel_idx" ON "ProductTrafficChannelDaily"("channel");

-- CreateIndex
CREATE UNIQUE INDEX "ProductTrafficChannelDaily_productId_date_source_channel_key" ON "ProductTrafficChannelDaily"("productId", "date", "source", "channel");

-- CreateIndex
CREATE INDEX "ProductTrafficBrowserDaily_productId_date_idx" ON "ProductTrafficBrowserDaily"("productId", "date");

-- CreateIndex
CREATE INDEX "ProductTrafficBrowserDaily_browser_idx" ON "ProductTrafficBrowserDaily"("browser");

-- CreateIndex
CREATE UNIQUE INDEX "ProductTrafficBrowserDaily_productId_date_source_browser_key" ON "ProductTrafficBrowserDaily"("productId", "date", "source", "browser");

-- CreateIndex
CREATE INDEX "ProductTrafficOperatingSystemDaily_productId_date_idx" ON "ProductTrafficOperatingSystemDaily"("productId", "date");

-- CreateIndex
CREATE INDEX "ProductTrafficOperatingSystemDaily_operatingSystem_idx" ON "ProductTrafficOperatingSystemDaily"("operatingSystem");

-- CreateIndex
CREATE UNIQUE INDEX "ProductTrafficOperatingSystemDaily_productId_date_source_op_key" ON "ProductTrafficOperatingSystemDaily"("productId", "date", "source", "operatingSystem");

-- CreateIndex
CREATE INDEX "ProductTrafficDeviceDaily_productId_date_idx" ON "ProductTrafficDeviceDaily"("productId", "date");

-- CreateIndex
CREATE INDEX "ProductTrafficDeviceDaily_deviceCategory_idx" ON "ProductTrafficDeviceDaily"("deviceCategory");

-- CreateIndex
CREATE UNIQUE INDEX "ProductTrafficDeviceDaily_productId_date_source_deviceCateg_key" ON "ProductTrafficDeviceDaily"("productId", "date", "source", "deviceCategory");

-- CreateIndex
CREATE INDEX "ProductTrafficCountryDaily_productId_date_idx" ON "ProductTrafficCountryDaily"("productId", "date");

-- CreateIndex
CREATE INDEX "ProductTrafficCountryDaily_country_idx" ON "ProductTrafficCountryDaily"("country");

-- CreateIndex
CREATE UNIQUE INDEX "ProductTrafficCountryDaily_productId_date_source_country_co_key" ON "ProductTrafficCountryDaily"("productId", "date", "source", "country", "countryCode");

-- CreateIndex
CREATE INDEX "ProductTrafficCityDaily_productId_date_idx" ON "ProductTrafficCityDaily"("productId", "date");

-- CreateIndex
CREATE INDEX "ProductTrafficCityDaily_city_idx" ON "ProductTrafficCityDaily"("city");

-- CreateIndex
CREATE UNIQUE INDEX "ProductTrafficCityDaily_productId_date_source_city_region_c_key" ON "ProductTrafficCityDaily"("productId", "date", "source", "city", "region", "country", "countryCode");

-- AddForeignKey
ALTER TABLE "ProductTrafficDaily" ADD CONSTRAINT "ProductTrafficDaily_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductTrafficDaily" ADD CONSTRAINT "ProductTrafficDaily_ingestionRunId_fkey" FOREIGN KEY ("ingestionRunId") REFERENCES "AnalyticsIngestionRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductTrafficReferrerDaily" ADD CONSTRAINT "ProductTrafficReferrerDaily_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductTrafficReferrerDaily" ADD CONSTRAINT "ProductTrafficReferrerDaily_ingestionRunId_fkey" FOREIGN KEY ("ingestionRunId") REFERENCES "AnalyticsIngestionRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductTrafficChannelDaily" ADD CONSTRAINT "ProductTrafficChannelDaily_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductTrafficChannelDaily" ADD CONSTRAINT "ProductTrafficChannelDaily_ingestionRunId_fkey" FOREIGN KEY ("ingestionRunId") REFERENCES "AnalyticsIngestionRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductTrafficBrowserDaily" ADD CONSTRAINT "ProductTrafficBrowserDaily_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductTrafficBrowserDaily" ADD CONSTRAINT "ProductTrafficBrowserDaily_ingestionRunId_fkey" FOREIGN KEY ("ingestionRunId") REFERENCES "AnalyticsIngestionRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductTrafficOperatingSystemDaily" ADD CONSTRAINT "ProductTrafficOperatingSystemDaily_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductTrafficOperatingSystemDaily" ADD CONSTRAINT "ProductTrafficOperatingSystemDaily_ingestionRunId_fkey" FOREIGN KEY ("ingestionRunId") REFERENCES "AnalyticsIngestionRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductTrafficDeviceDaily" ADD CONSTRAINT "ProductTrafficDeviceDaily_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductTrafficDeviceDaily" ADD CONSTRAINT "ProductTrafficDeviceDaily_ingestionRunId_fkey" FOREIGN KEY ("ingestionRunId") REFERENCES "AnalyticsIngestionRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductTrafficCountryDaily" ADD CONSTRAINT "ProductTrafficCountryDaily_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductTrafficCountryDaily" ADD CONSTRAINT "ProductTrafficCountryDaily_ingestionRunId_fkey" FOREIGN KEY ("ingestionRunId") REFERENCES "AnalyticsIngestionRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductTrafficCityDaily" ADD CONSTRAINT "ProductTrafficCityDaily_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductTrafficCityDaily" ADD CONSTRAINT "ProductTrafficCityDaily_ingestionRunId_fkey" FOREIGN KEY ("ingestionRunId") REFERENCES "AnalyticsIngestionRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
