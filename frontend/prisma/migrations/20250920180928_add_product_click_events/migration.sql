-- CreateTable
CREATE TABLE "public"."ProductClickEvent" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductClickEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductClickEvent_productId_createdAt_idx" ON "public"."ProductClickEvent"("productId", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."ProductClickEvent" ADD CONSTRAINT "ProductClickEvent_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
