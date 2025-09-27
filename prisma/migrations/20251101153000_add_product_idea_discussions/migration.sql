ALTER TABLE "public"."ProductIdeaProfile"
  ADD COLUMN     "redditDiscussionQueries" JSONB,
  ADD COLUMN     "redditDiscussions" JSONB,
  ADD COLUMN     "redditInsights" JSONB,
  ADD COLUMN     "redditStatus" "public"."ProductIdeaProfileStatus",
  ADD COLUMN     "redditErrorMessage" TEXT,
  ADD COLUMN     "redditModel" TEXT,
  ADD COLUMN     "lastRedditDiscoveryAt" TIMESTAMP(3);
