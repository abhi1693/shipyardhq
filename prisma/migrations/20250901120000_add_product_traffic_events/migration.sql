-- CreateEnum
CREATE TYPE "public"."DeviceCategory" AS ENUM ('desktop', 'mobile', 'tablet', 'unknown');

-- CreateTable
CREATE TABLE "public"."ProductTrafficEvent" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "referrer" TEXT,
    "userAgent" TEXT,
    "device" "public"."DeviceCategory" NOT NULL DEFAULT 'unknown',
    "browser" TEXT,
    "os" TEXT,
    "country" TEXT,
    "region" TEXT,
    "city" TEXT,
    "ipHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductTrafficEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductTrafficEvent_productId_createdAt_idx" ON "public"."ProductTrafficEvent"("productId", "createdAt");

-- CreateIndex
CREATE INDEX "ProductTrafficEvent_country_idx" ON "public"."ProductTrafficEvent"("country");

-- CreateIndex
CREATE INDEX "ProductTrafficEvent_device_idx" ON "public"."ProductTrafficEvent"("device");

-- AddForeignKey
ALTER TABLE "public"."ProductTrafficEvent" ADD CONSTRAINT "ProductTrafficEvent_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
