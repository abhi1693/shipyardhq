-- Replace PlanType enum to drop 'recurring_price'
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PlanType') THEN
    ALTER TYPE "public"."PlanType" RENAME TO "PlanType_old";
  END IF;
END $$;

CREATE TYPE IF NOT EXISTS "public"."PlanType" AS ENUM ('one_time_price');

ALTER TABLE "public"."Plan"
  ALTER COLUMN "type" TYPE "public"."PlanType" USING "type"::text::"public"."PlanType";

DROP TYPE IF EXISTS "public"."PlanType_old";
