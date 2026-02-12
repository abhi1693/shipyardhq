-- Add composite indexes to speed up category listing queries.
-- Low-risk: additive, no behavior change.

CREATE INDEX IF NOT EXISTS "Product_categoryId_status_createdAt_idx"
ON "public"."Product" ("categoryId", "status", "createdAt");

CREATE INDEX IF NOT EXISTS "Product_categoryId_status_publishedAt_idx"
ON "public"."Product" ("categoryId", "status", "publishedAt");
