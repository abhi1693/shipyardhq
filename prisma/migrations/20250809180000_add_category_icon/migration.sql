-- Add required icon column with a safe default for existing rows
ALTER TABLE "Category" ADD COLUMN "icon" TEXT NOT NULL DEFAULT 'tool';

-- Optional: drop the default if you don't want future implicit defaults
ALTER TABLE "Category" ALTER COLUMN "icon" DROP DEFAULT;

