import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/prisma", () => ({ default: {} }))

import { CLOUDFLARE_ANALYTICS_DATASET } from "@/lib/server/analytics/cloudflareAnalytics"
import { coversAnalyticsRange } from "@/lib/server/analytics/ingestion/coverage"
import { resolveIngestionWindow } from "@/lib/server/analytics/ingestion/shared"

function utcDate(value: string) {
  return new Date(`${value}T00:00:00Z`)
}

function coverageRun(
  start: string,
  end: string,
  dataset: string = CLOUDFLARE_ANALYTICS_DATASET,
) {
  return {
    windowStart: utcDate(start),
    windowEnd: utcDate(end),
    stats: { dataset },
  }
}

describe("analytics ingestion windows", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("defaults to the seven most recent completed UTC days", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-07-14T12:00:00Z"))

    const window = resolveIngestionWindow({})

    expect(window.startDate).toBe("2026-07-07")
    expect(window.endDate).toBe("2026-07-13")
    expect(window.days).toBe(7)
  })
})

describe("analytics ingestion coverage", () => {
  const bounds = {
    start: utcDate("2026-07-01"),
    end: utcDate("2026-07-07"),
  }

  it("accepts contiguous completed runs that cover the requested range", () => {
    expect(
      coversAnalyticsRange(
        [
          coverageRun("2026-07-04", "2026-07-07"),
          coverageRun("2026-07-01", "2026-07-03"),
        ],
        bounds,
      ),
    ).toBe(true)
  })

  it("rejects ranges with an uncovered day", () => {
    expect(
      coversAnalyticsRange(
        [
          coverageRun("2026-07-01", "2026-07-03"),
          coverageRun("2026-07-05", "2026-07-07"),
        ],
        bounds,
      ),
    ).toBe(false)
  })

  it("ignores runs written by a different analytics dataset", () => {
    expect(
      coversAnalyticsRange(
        [coverageRun("2026-07-01", "2026-07-07", "legacy-dataset")],
        bounds,
      ),
    ).toBe(false)
  })
})
