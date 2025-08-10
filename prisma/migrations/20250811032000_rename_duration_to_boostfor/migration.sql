-- Add boostForDays with default 0, migrate data, drop durationDays
ALTER TABLE "public"."Plan" ADD COLUMN IF NOT EXISTS "boostForDays" INTEGER NOT NULL DEFAULT 0;
-- Copy existing values if durationDays exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'Plan' AND column_name = 'durationDays'
  ) THEN
    EXECUTE 'UPDATE "public"."Plan" SET "boostForDays" = COALESCE("durationDays", 0)';
    ALTER TABLE "public"."Plan" DROP COLUMN IF EXISTS "durationDays";
  END IF;
END $$;

