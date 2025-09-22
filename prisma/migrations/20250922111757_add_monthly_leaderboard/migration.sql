-- CreateTable
CREATE TABLE "public"."MonthlyProductRanking" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "month" TIMESTAMP(3) NOT NULL,
    "rank" INTEGER NOT NULL,
    "score" INTEGER,
    "upvotes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlyProductRanking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MonthlyProductRanking_productId_month_idx" ON "public"."MonthlyProductRanking"("productId", "month");

-- CreateIndex
CREATE INDEX "MonthlyProductRanking_month_idx" ON "public"."MonthlyProductRanking"("month");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyProductRanking_month_productId_key" ON "public"."MonthlyProductRanking"("month", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyProductRanking_month_rank_key" ON "public"."MonthlyProductRanking"("month", "rank");

-- AddForeignKey
ALTER TABLE "public"."MonthlyProductRanking" ADD CONSTRAINT "MonthlyProductRanking_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
