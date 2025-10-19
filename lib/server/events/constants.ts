import type { EventEnvelopeStatus } from "@/lib/vendor/prisma/client"

export const EVENT_STATUS_KEYS: ReadonlyArray<EventEnvelopeStatus> = [
  "pending",
  "processing",
  "retrying",
  "completed",
  "dead_letter",
]
