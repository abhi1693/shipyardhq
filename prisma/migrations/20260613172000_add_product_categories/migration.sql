CREATE TABLE "ProductCategory" (
    "productId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductCategory_pkey" PRIMARY KEY ("productId", "categoryId")
);

INSERT INTO "ProductCategory" ("productId", "categoryId")
SELECT "id", "categoryId"
FROM "Product"
ON CONFLICT ("productId", "categoryId") DO NOTHING;

CREATE INDEX "ProductCategory_categoryId_productId_idx" ON "ProductCategory"("categoryId", "productId");
CREATE INDEX "ProductCategory_productId_idx" ON "ProductCategory"("productId");
CREATE INDEX "ProductCategory_createdAt_idx" ON "ProductCategory"("createdAt");

ALTER TABLE "ProductCategory"
ADD CONSTRAINT "ProductCategory_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "Product"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductCategory"
ADD CONSTRAINT "ProductCategory_categoryId_fkey"
FOREIGN KEY ("categoryId") REFERENCES "Category"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
