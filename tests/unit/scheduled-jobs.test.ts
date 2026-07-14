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

  it("does not expose legacy HTTP cron paths", () => {
    for (const definition of SCHEDULED_JOB_DEFINITIONS) {
      expect("path" in definition).toBe(false)
    }
  })

  it("runs traffic-dependent scoring after the daily analytics sync", () => {
    const patterns = new Map(
      SCHEDULED_JOB_DEFINITIONS.map((definition) => [
        definition.id,
        definition.pattern,
      ]),
    )

    expect(patterns.get("analytics-sync")).toBe("0 0 2 * * *")
    expect(patterns.get("leaderboard-highlights-day")).toBe("0 15 3 * * *")
    expect(patterns.get("leaderboard-highlights-week")).toBe("0 30 3 * * 1")
    expect(patterns.get("badges-trending")).toBe("0 45 3 * * *")
  })
})
