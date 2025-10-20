ALTER TABLE "EventEnvelope"
ADD COLUMN "queue" TEXT NOT NULL DEFAULT 'default';

CREATE INDEX "EventEnvelope_queue_status_nextRunAt_idx"
  ON "EventEnvelope"("queue", "status", "nextRunAt");
