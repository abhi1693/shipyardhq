-- Drop stored model columns for Reddit features; model selection is now env-driven
ALTER TABLE "ProductIdeaProfile" DROP COLUMN IF EXISTS "subredditModel";
ALTER TABLE "ProductIdeaProfile" DROP COLUMN IF EXISTS "redditModel";
