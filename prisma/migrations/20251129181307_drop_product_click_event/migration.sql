-- Cleanup legacy click tracking artifacts
ALTER TABLE "public"."ProductClickEvent" DROP CONSTRAINT IF EXISTS "ProductClickEvent_productId_fkey";

DROP TABLE IF EXISTS "public"."ProductClickEvent";

ALTER TABLE "public"."ProductAnalytics" DROP COLUMN IF EXISTS "clicks";
