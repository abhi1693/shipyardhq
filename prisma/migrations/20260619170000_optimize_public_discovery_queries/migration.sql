-- Add an index for public discovery queries that split priority plans from
-- regular listings. The application resolves priority plan IDs once and
-- filters Product.planId directly instead of joining through Plan features for
-- every product list/count query.
CREATE INDEX IF NOT EXISTS "Product_planId_status_createdAt_idx"
ON "public"."Product" ("planId", "status", "createdAt");
