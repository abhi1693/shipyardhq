-- CreateTable
CREATE TABLE "public"."AlternativeProduct" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "websiteUrl" TEXT NOT NULL,
    "logoUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlternativeProduct_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AlternativeProduct_websiteUrl_key" ON "public"."AlternativeProduct"("websiteUrl");

-- CreateTable
CREATE TABLE "public"."_ProductAlternativeProducts" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "public"."_AlternativeProductCategories" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE UNIQUE INDEX "_ProductAlternativeProducts_AB_unique" ON "public"."_ProductAlternativeProducts"("A", "B");

-- CreateIndex
CREATE INDEX "_ProductAlternativeProducts_B_index" ON "public"."_ProductAlternativeProducts"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_AlternativeProductCategories_AB_unique" ON "public"."_AlternativeProductCategories"("A", "B");

-- CreateIndex
CREATE INDEX "_AlternativeProductCategories_B_index" ON "public"."_AlternativeProductCategories"("B");

-- AddForeignKey
ALTER TABLE "public"."_ProductAlternativeProducts" ADD CONSTRAINT "_ProductAlternativeProducts_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."AlternativeProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_ProductAlternativeProducts" ADD CONSTRAINT "_ProductAlternativeProducts_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_AlternativeProductCategories" ADD CONSTRAINT "_AlternativeProductCategories_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."AlternativeProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_AlternativeProductCategories" ADD CONSTRAINT "_AlternativeProductCategories_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
