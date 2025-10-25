-- Add slug column
ALTER TABLE "AlternativeProduct" ADD COLUMN "slug" TEXT;

-- Backfill slug values with uniqueness handling
WITH base AS (
  SELECT
    id,
    trim(BOTH '-' FROM regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g')) AS slug_base,
    ROW_NUMBER() OVER (
      PARTITION BY trim(BOTH '-' FROM regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g'))
      ORDER BY "createdAt", id
    ) AS rn
  FROM "AlternativeProduct"
), normalized AS (
  SELECT
    id,
    CASE
      WHEN slug_base IS NULL OR slug_base = '' THEN 'alternative-' || id
      WHEN rn = 1 THEN slug_base
      ELSE slug_base || '-' || rn::text
    END AS slug
  FROM base
)
UPDATE "AlternativeProduct" AS ap
SET "slug" = normalized.slug
FROM normalized
WHERE ap.id = normalized.id;

-- Ensure all rows have a slug
UPDATE "AlternativeProduct"
SET "slug" = 'alternative-' || id
WHERE "slug" IS NULL OR "slug" = '';

-- Enforce constraints
ALTER TABLE "AlternativeProduct" ALTER COLUMN "slug" SET NOT NULL;
ALTER TABLE "AlternativeProduct" ADD CONSTRAINT "AlternativeProduct_slug_key" UNIQUE ("slug");

CREATE INDEX IF NOT EXISTS "AlternativeProduct_slug_idx" ON "AlternativeProduct"("slug");
