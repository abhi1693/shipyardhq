-- CreateEnum
CREATE TYPE "LeaderboardRunStatus" AS ENUM ('pending', 'processing', 'finalized');

-- CreateTable
CREATE TABLE "LeaderboardRun" (
    "id" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "status" "LeaderboardRunStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaderboardRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductLeaderboardScore" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "uniqueVisitors" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "upvotes" INTEGER NOT NULL DEFAULT 0,
    "reviewsCount" INTEGER NOT NULL DEFAULT 0,
    "reviewsRatingSum" INTEGER NOT NULL DEFAULT 0,
    "score" INTEGER NOT NULL DEFAULT 0,
    "scoreComponents" JSONB,
    "rank" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductLeaderboardScore_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LeaderboardRun_status_idx" ON "LeaderboardRun"("status");

-- CreateIndex
CREATE INDEX "LeaderboardRun_createdAt_idx" ON "LeaderboardRun"("createdAt");

-- CreateIndex
CREATE INDEX "LeaderboardRun_updatedAt_idx" ON "LeaderboardRun"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "LeaderboardRun_periodStart_periodEnd_key" ON "LeaderboardRun"("periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "ProductLeaderboardScore_runId_rank_idx" ON "ProductLeaderboardScore"("runId", "rank");

-- CreateIndex
CREATE INDEX "ProductLeaderboardScore_runId_score_idx" ON "ProductLeaderboardScore"("runId", "score");

-- CreateIndex
CREATE INDEX "ProductLeaderboardScore_createdAt_idx" ON "ProductLeaderboardScore"("createdAt");

-- CreateIndex
CREATE INDEX "ProductLeaderboardScore_updatedAt_idx" ON "ProductLeaderboardScore"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProductLeaderboardScore_runId_productId_key" ON "ProductLeaderboardScore"("runId", "productId");

-- AddForeignKey
ALTER TABLE "ProductLeaderboardScore" ADD CONSTRAINT "ProductLeaderboardScore_runId_fkey" FOREIGN KEY ("runId") REFERENCES "LeaderboardRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductLeaderboardScore" ADD CONSTRAINT "ProductLeaderboardScore_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
