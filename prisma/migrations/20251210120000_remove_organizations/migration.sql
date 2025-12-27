-- Remove organization feature tables and column
ALTER TABLE "public"."Product" DROP COLUMN IF EXISTS "organizationId";
DROP TABLE IF EXISTS "public"."OrganizationMembership";
DROP TABLE IF EXISTS "public"."Organization";
