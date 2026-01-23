-- CreateIndex
CREATE INDEX "Product_createdAt_idx" ON "public"."Product"("createdAt");

-- CreateIndex
CREATE INDEX "Product_updatedAt_idx" ON "public"."Product"("updatedAt");

-- CreateIndex
CREATE INDEX "ProductAnalytics_upvotes_idx" ON "public"."ProductAnalytics"("upvotes");

-- CreateIndex
CREATE INDEX "ProductBadge_badge_idx" ON "public"."ProductBadge"("badge");
