-- CreateTable
CREATE TABLE "public"."MonthlyLeaderboardNotification" (
    "id" TEXT NOT NULL,
    "month" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlyLeaderboardNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyLeaderboardNotification_month_key" ON "public"."MonthlyLeaderboardNotification"("month");
