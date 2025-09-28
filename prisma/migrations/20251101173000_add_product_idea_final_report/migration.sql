ALTER TABLE "public"."ProductIdeaProfile"
  ADD COLUMN     "finalReport" JSONB,
  ADD COLUMN     "finalReportStatus" "public"."ProductIdeaProfileStatus",
  ADD COLUMN     "finalReportErrorMessage" TEXT,
  ADD COLUMN     "finalReportModel" TEXT,
  ADD COLUMN     "lastFinalReportAt" TIMESTAMP(3);
