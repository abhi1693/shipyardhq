-- CreateEnum
CREATE TYPE "EventEnvelopeStatus" AS ENUM ('pending', 'processing', 'retrying', 'completed', 'dead_letter');

-- CreateEnum
CREATE TYPE "EventAttemptStatus" AS ENUM ('succeeded', 'failed', 'timed_out');

-- CreateTable
CREATE TABLE "EventEnvelope" (
    "id" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "asyncHandlers" TEXT[] NOT NULL,
    "pendingHandlers" TEXT[] NOT NULL,
    "status" "EventEnvelopeStatus" NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "enqueuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processingStarted" TIMESTAMP(3),
    "processedAt" TIMESTAMP(3),
    "nextRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventEnvelope_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventAttempt" (
    "id" TEXT NOT NULL,
    "envelopeId" TEXT NOT NULL,
    "handler" TEXT NOT NULL,
    "status" "EventAttemptStatus" NOT NULL,
    "durationMs" INTEGER,
    "error" TEXT,
    "attempt" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventEnvelope_status_nextRunAt_idx" ON "EventEnvelope"("status", "nextRunAt");

-- CreateIndex
CREATE INDEX "EventEnvelope_createdAt_idx" ON "EventEnvelope"("createdAt");

-- CreateIndex
CREATE INDEX "EventEnvelope_updatedAt_idx" ON "EventEnvelope"("updatedAt");

-- CreateIndex
CREATE INDEX "EventAttempt_envelopeId_createdAt_idx" ON "EventAttempt"("envelopeId", "createdAt");

-- AddForeignKey
ALTER TABLE "EventAttempt" ADD CONSTRAINT "EventAttempt_envelopeId_fkey" FOREIGN KEY ("envelopeId") REFERENCES "EventEnvelope"("id") ON DELETE CASCADE ON UPDATE CASCADE;
