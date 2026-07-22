ALTER TABLE "public"."ProductAnalytics"
ADD COLUMN "websiteClicks" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "ProductAnalytics_websiteClicks_idx"
ON "public"."ProductAnalytics"("websiteClicks");
