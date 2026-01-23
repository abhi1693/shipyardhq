DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "information_schema"."tables"
    WHERE "table_schema" = 'public'
      AND "table_name" = 'ProductClickEvent'
  ) THEN
    ALTER TABLE "public"."ProductClickEvent" DROP CONSTRAINT IF EXISTS "ProductClickEvent_productId_fkey";
    DROP TABLE IF EXISTS "public"."ProductClickEvent";
  END IF;
END $$;

ALTER TABLE "public"."ProductAnalytics" DROP COLUMN IF EXISTS "clicks";
