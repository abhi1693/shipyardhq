-- AlterTable
ALTER TABLE "public"."ProductClickEvent" ADD COLUMN     "browser" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "device" "public"."DeviceCategory" NOT NULL DEFAULT 'unknown',
ADD COLUMN     "ipHash" TEXT,
ADD COLUMN     "os" TEXT,
ADD COLUMN     "referrer" TEXT,
ADD COLUMN     "region" TEXT,
ADD COLUMN     "userAgent" TEXT;
