CREATE TABLE "LaunchLifecycleEvent" (
  "key" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "acquisitionContext" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LaunchLifecycleEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "LaunchLifecycleEvent_kind_createdAt_idx" ON "LaunchLifecycleEvent"("kind", "createdAt");
CREATE INDEX "LaunchLifecycleEvent_userId_kind_createdAt_idx" ON "LaunchLifecycleEvent"("userId", "kind", "createdAt");

-- Baseline is an observation of missing history, never a publication timestamp.
-- Include existing drafts too: their prior publication history is unknowable.
INSERT INTO "LaunchLifecycleEvent" ("key", "userId", "entityId", "kind")
SELECT 'legacy_history_unknown:' || id, "userId", id, 'legacy_history_unknown'
FROM "Product";
