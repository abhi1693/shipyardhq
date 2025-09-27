ALTER TABLE "ProductIdeaProfile"
  DROP COLUMN "promptTokens",
  DROP COLUMN "completionTokens",
  DROP COLUMN "totalTokens";

ALTER TYPE "ProductIdeaProfileStatus" ADD VALUE IF NOT EXISTS 'pending';
