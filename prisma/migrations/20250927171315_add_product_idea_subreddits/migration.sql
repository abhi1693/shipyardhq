-- AlterTable
ALTER TABLE "public"."ProductIdeaProfile" ADD COLUMN     "lastSubredditDiscoveryAt" TIMESTAMP(3),
ADD COLUMN     "subredditErrorMessage" TEXT,
ADD COLUMN     "subredditModel" TEXT,
ADD COLUMN     "subredditQueries" JSONB,
ADD COLUMN     "subredditStatus" "public"."ProductIdeaProfileStatus",
ADD COLUMN     "subreddits" JSONB;
