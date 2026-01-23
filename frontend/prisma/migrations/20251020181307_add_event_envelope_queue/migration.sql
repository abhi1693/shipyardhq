-- AlterTable
ALTER TABLE "EventEnvelope" ADD COLUMN     "queue" TEXT NOT NULL DEFAULT 'default',
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "EventEnvelope_queue_status_nextRunAt_idx" ON "EventEnvelope"("queue", "status", "nextRunAt");
