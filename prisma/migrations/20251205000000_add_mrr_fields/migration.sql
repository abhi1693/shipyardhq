-- Add MRR tracking on connector and snapshots
ALTER TABLE "PaymentConnector"
ADD COLUMN IF NOT EXISTS "latestMrrCents" INTEGER;

ALTER TABLE "PaymentRevenueSnapshot"
ADD COLUMN IF NOT EXISTS "mrrCents" INTEGER;
