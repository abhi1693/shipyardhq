-- AlterTable
ALTER TABLE "ProductTrafficEvent" ADD COLUMN     "isBot" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "ProductTrafficEvent_isBot_idx" ON "ProductTrafficEvent"("isBot");
