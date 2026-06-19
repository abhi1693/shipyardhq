-- Materialize normalized product keywords so public tag pages do not repeatedly
-- expand Product.keywords and recompute hashes/slugs on every cold request.

CREATE TABLE IF NOT EXISTS "public"."ProductKeyword" (
    "productId" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "canonical" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "productStatus" "public"."ProductStatus" NOT NULL,
    "productUpdatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductKeyword_pkey" PRIMARY KEY ("productId", "keyword")
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM "pg_constraint"
        WHERE "conname" = 'ProductKeyword_productId_fkey'
    ) THEN
        ALTER TABLE "public"."ProductKeyword"
            ADD CONSTRAINT "ProductKeyword_productId_fkey"
            FOREIGN KEY ("productId")
            REFERENCES "public"."Product"("id")
            ON DELETE CASCADE
            ON UPDATE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "ProductKeyword_productStatus_slug_idx"
ON "public"."ProductKeyword" ("productStatus", "slug");

CREATE INDEX IF NOT EXISTS "ProductKeyword_productStatus_hash_idx"
ON "public"."ProductKeyword" ("productStatus", "hash");

CREATE INDEX IF NOT EXISTS "ProductKeyword_productStatus_keyword_productUpdatedAt_idx"
ON "public"."ProductKeyword" ("productStatus", "keyword", "productUpdatedAt" DESC);

CREATE OR REPLACE FUNCTION "public"."sync_product_keywords"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        DELETE FROM "public"."ProductKeyword"
        WHERE "productId" = OLD."id";
        RETURN OLD;
    END IF;

    DELETE FROM "public"."ProductKeyword"
    WHERE "productId" = NEW."id";

    INSERT INTO "public"."ProductKeyword" (
        "productId",
        "keyword",
        "canonical",
        "hash",
        "slug",
        "productStatus",
        "productUpdatedAt",
        "updatedAt"
    )
    SELECT
        NEW."id",
        normalized."keyword",
        normalized."canonical",
        normalized."hash",
        normalized."slug",
        NEW."status",
        COALESCE(NEW."updatedAt", NEW."publishedAt", NEW."createdAt", CURRENT_TIMESTAMP),
        CURRENT_TIMESTAMP
    FROM (
        SELECT DISTINCT ON (LOWER(TRIM(keyword_value)))
            LOWER(TRIM(keyword_value)) AS "keyword",
            TRIM(keyword_value) AS "canonical",
            SUBSTRING(md5(LOWER(TRIM(keyword_value))), 1, 6) AS "hash",
            COALESCE(
                NULLIF(
                    REGEXP_REPLACE(
                        REGEXP_REPLACE(LOWER(TRIM(keyword_value)), '[^a-z0-9]+', '-', 'g'),
                        '(^-|-$)',
                        '',
                        'g'
                    ),
                    ''
                ),
                SUBSTRING(md5(LOWER(TRIM(keyword_value))), 1, 6)
            ) AS "slug"
        FROM UNNEST(COALESCE(NEW."keywords", ARRAY[]::TEXT[])) AS keyword_value
        WHERE keyword_value IS NOT NULL
          AND TRIM(keyword_value) <> ''
        ORDER BY LOWER(TRIM(keyword_value)), TRIM(keyword_value)
    ) AS normalized;

    RETURN NEW;
END;
$$;

WITH expanded AS (
    SELECT
        p."id" AS "productId",
        LOWER(TRIM(keyword_value)) AS "keyword",
        TRIM(keyword_value) AS "canonical",
        SUBSTRING(md5(LOWER(TRIM(keyword_value))), 1, 6) AS "hash",
        COALESCE(
            NULLIF(
                REGEXP_REPLACE(
                    REGEXP_REPLACE(LOWER(TRIM(keyword_value)), '[^a-z0-9]+', '-', 'g'),
                    '(^-|-$)',
                    '',
                    'g'
                ),
                ''
            ),
            SUBSTRING(md5(LOWER(TRIM(keyword_value))), 1, 6)
        ) AS "slug",
        p."status" AS "productStatus",
        COALESCE(p."updatedAt", p."publishedAt", p."createdAt", CURRENT_TIMESTAMP) AS "productUpdatedAt"
    FROM "public"."Product" p
    CROSS JOIN LATERAL UNNEST(COALESCE(p."keywords", ARRAY[]::TEXT[])) AS keyword_value
    WHERE keyword_value IS NOT NULL
      AND TRIM(keyword_value) <> ''
),
deduped AS (
    SELECT DISTINCT ON ("productId", "keyword")
        "productId",
        "keyword",
        "canonical",
        "hash",
        "slug",
        "productStatus",
        "productUpdatedAt"
    FROM expanded
    ORDER BY "productId", "keyword", "canonical"
)
INSERT INTO "public"."ProductKeyword" (
    "productId",
    "keyword",
    "canonical",
    "hash",
    "slug",
    "productStatus",
    "productUpdatedAt",
    "updatedAt"
)
SELECT
    "productId",
    "keyword",
    "canonical",
    "hash",
    "slug",
    "productStatus",
    "productUpdatedAt",
    CURRENT_TIMESTAMP
FROM deduped
ON CONFLICT ("productId", "keyword") DO UPDATE
SET
    "canonical" = EXCLUDED."canonical",
    "hash" = EXCLUDED."hash",
    "slug" = EXCLUDED."slug",
    "productStatus" = EXCLUDED."productStatus",
    "productUpdatedAt" = EXCLUDED."productUpdatedAt",
    "updatedAt" = CURRENT_TIMESTAMP;

DROP TRIGGER IF EXISTS "sync_product_keywords_after_product_change" ON "public"."Product";

CREATE TRIGGER "sync_product_keywords_after_product_change"
AFTER INSERT OR UPDATE OF "keywords", "status", "updatedAt", "publishedAt", "createdAt" OR DELETE
ON "public"."Product"
FOR EACH ROW
EXECUTE FUNCTION "public"."sync_product_keywords"();
