import { describe, expect, it } from "vitest"

import {
  SCHEDULED_JOB_DEFINITIONS,
  SCHEDULED_JOB_TIMEZONE,
} from "@/lib/server/jobs/scheduled"

describe("scheduled BullMQ jobs", () => {
  it("uses stable unique scheduler ids", () => {
    const ids = SCHEDULED_JOB_DEFINITIONS.map((definition) => definition.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("uses six-field UTC cron patterns for BullMQ", () => {
    expect(SCHEDULED_JOB_TIMEZONE).toBe("Etc/UTC")

    for (const definition of SCHEDULED_JOB_DEFINITIONS) {
      expect(definition.pattern.split(/\s+/)).toHaveLength(6)
    }
  })

  it("does not reschedule legacy event drain cron endpoints", () => {
    expect(
      SCHEDULED_JOB_DEFINITIONS.some((definition) =>
        definition.path.startsWith("/api/cron/events/drain"),
      ),
    ).toBe(false)
  })
})
