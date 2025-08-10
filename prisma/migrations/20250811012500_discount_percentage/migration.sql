-- Alter discount column from INTEGER (cents) to DOUBLE PRECISION (percentage)
ALTER TABLE "public"."Plan"
  ALTER COLUMN "discount" TYPE DOUBLE PRECISION USING "discount"::double precision;

-- Convert existing data from cents to percentage based on current semantics:
-- Previously: price = final price in cents, discount = saved amount in cents
-- Base/original = price + discount; Percent = discount / (price + discount) * 100
UPDATE "public"."Plan"
SET "discount" = CASE
  WHEN "discount" IS NULL OR "discount" = 0 THEN 0
  ELSE ROUND(("discount"::double precision) / (("price" + COALESCE("discount", 0))::double precision) * 100.0, 4)
END;

-- Ensure discount stays within 0..100 range
ALTER TABLE "public"."Plan"
  ADD CONSTRAINT "Plan_discount_percentage_range" CHECK ("discount" >= 0 AND "discount" <= 100);

