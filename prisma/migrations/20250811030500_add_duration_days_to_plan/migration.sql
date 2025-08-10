-- Add durationDays column to Plan with default 30 and not null
ALTER TABLE "public"."Plan" ADD COLUMN IF NOT EXISTS "durationDays" INTEGER NOT NULL DEFAULT 30;

