-- Drop interval and frequency columns from Plan
ALTER TABLE "public"."Plan" DROP COLUMN IF EXISTS "interval";
ALTER TABLE "public"."Plan" DROP COLUMN IF EXISTS "frequency";

