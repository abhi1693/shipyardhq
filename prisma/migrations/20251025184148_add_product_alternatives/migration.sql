-- CreateTable
CREATE TABLE "AlternativeProduct" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "websiteUrl" TEXT NOT NULL,
    "logoUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlternativeProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ProductAlternativeProducts" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ProductAlternativeProducts_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_AlternativeProductCategories" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_AlternativeProductCategories_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "AlternativeProduct_websiteUrl_key" ON "AlternativeProduct"("websiteUrl");

-- CreateIndex
CREATE INDEX "AlternativeProduct_createdAt_idx" ON "AlternativeProduct"("createdAt");

-- CreateIndex
CREATE INDEX "AlternativeProduct_updatedAt_idx" ON "AlternativeProduct"("updatedAt");

-- CreateIndex
CREATE INDEX "_ProductAlternativeProducts_B_index" ON "_ProductAlternativeProducts"("B");

-- CreateIndex
CREATE INDEX "_AlternativeProductCategories_B_index" ON "_AlternativeProductCategories"("B");

-- AddForeignKey
ALTER TABLE "_ProductAlternativeProducts" ADD CONSTRAINT "_ProductAlternativeProducts_A_fkey" FOREIGN KEY ("A") REFERENCES "AlternativeProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProductAlternativeProducts" ADD CONSTRAINT "_ProductAlternativeProducts_B_fkey" FOREIGN KEY ("B") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AlternativeProductCategories" ADD CONSTRAINT "_AlternativeProductCategories_A_fkey" FOREIGN KEY ("A") REFERENCES "AlternativeProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AlternativeProductCategories" ADD CONSTRAINT "_AlternativeProductCategories_B_fkey" FOREIGN KEY ("B") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
